import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTextEmbedding } from "@/lib/embeddings";

const GRAPH_VER = process.env.FB_GRAPH_VERSION || "v20.0";

// GET: Webhook verification handshake
export async function GET(req: NextRequest) {
  const verify = process.env.FB_WEBHOOK_VERIFY_TOKEN;
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === verify) {
    return new NextResponse(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

function verifySignature(req: NextRequest, rawBody: string): boolean {
  try {
    const appSecret = process.env.FB_APP_SECRET || "";
    if (!appSecret) return true; // allow if not configured (dev)
    const header = req.headers.get("x-hub-signature-256") || req.headers.get("x-hub-signature");
    if (!header) return false;
    const [algo, signature] = header.split("=");
    const hmac = crypto.createHmac(algo === "sha1" ? "sha1" : "sha256", appSecret);
    hmac.update(rawBody, "utf8");
    const expected = hmac.digest("hex");
    return signature === expected;
  } catch {
    return false;
  }
}

async function runRagForUser(userId: string, query: string) {
  const supabase = createSupabaseAdminClient();

  const embedding = await getTextEmbedding(query);

  // Get allowed tenant ids for this user
  const { data: memberships } = await supabase
    .from("user_tenants")
    .select("tenant_id")
    .eq("user_id", userId);
  const tenantIds = (memberships || []).map((m: any) => m.tenant_id).filter(Boolean);

  // Call RPCs for candidates
  const [hybridRes, vectorRes] = await Promise.allSettled([
    supabase.rpc("search_products_hybrid_text", {
      query_text: query,
      query_embedding: embedding,
      match_threshold: 0.2,
      match_count: 20,
    }),
    supabase.rpc("search_products_by_embedding", {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 20,
    }),
  ]);
  const hybrid = (hybridRes.status === "fulfilled" && (hybridRes.value as any)?.data) || [];
  const vector = (vectorRes.status === "fulfilled" && (vectorRes.value as any)?.data) || [];
  const all = [...hybrid, ...vector];
  const uniqueIds = Array.from(new Set(all.map((p: any) => p?.id).filter(Boolean)));

  // Fetch product details filtered by tenant
  let products: any[] = [];
  if (uniqueIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("id,name,sku,size,description,price,image_url,product_categories(name),tenant_id")
      .in("id", uniqueIds)
      .in("tenant_id", tenantIds)
      .limit(20);
    products = (data || []);
  }

  const top = products.slice(0, 5);
  const context = top.length > 0
    ? top.map((p: any, i: number) => {
        const categoryName = (p?.product_categories && p.product_categories?.name) || p?.category_name || null;
        const categoryLine = categoryName ? `\nCategory: ${categoryName}` : "";
        const sizeLine = p?.size ? `\nSize: ${p.size}` : "";
        const imageUrl = p?.image_url;
        return `#${i + 1} ${p.name} - $${p.price}${categoryLine}${sizeLine}\nKey: ${(p.description || "").slice(0, 140)}${imageUrl ? `\nImage: ${imageUrl}` : ""} ${p.sku ? `\nSKU: ${p.sku}` : ""}  ${p.stock ? `\nStock: ${p.stock}` : ""}`;
      }).join("\n")
    : "No relevant products found.";

  const system = `You are a helpful sales assistant. Use the following product context to answer questions succinctly.\n\n${context}`;
  const openaiResp = await fetch(process.env.OPENAI_BASE_URL + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL, messages: [
      { role: "system", content: system },
      { role: "user", content: query },
    ], temperature: 0.7, max_tokens: 400 }),
  });
  const j = await openaiResp.json().catch(() => null);
  const text = j?.choices?.[0]?.message?.content || "Sorry, I couldn't find that.";
  return text;
}

async function sendMessengerMessage(pageToken: string, recipientId: string, text: string) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VER}/me/messages`);
  url.searchParams.set("access_token", pageToken);
  await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
}

// POST: Messenger webhook
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(req, raw)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 403 });
  }

  const body = JSON.parse(raw || "{}");
  const supabase = createSupabaseAdminClient();

  try {
    const entries: any[] = Array.isArray(body?.entry) ? body.entry : [];
    for (const entry of entries) {
      const pageId: string | undefined = entry?.id;
      const messaging: any[] = Array.isArray(entry?.messaging) ? entry.messaging : [];
      if (!pageId || messaging.length === 0) continue;

      // Find active connected page to get user_id and page_token
      const { data: pageRow } = await supabase
        .from("facebook_pages")
        .select("user_id,page_id,page_token,is_active")
        .eq("page_id", pageId)
        .eq("is_active", true)
        .maybeSingle();
      if (!pageRow || !pageRow.page_token) continue;

      for (const evt of messaging) {
        const senderId = evt?.sender?.id;
        const text: string | undefined = evt?.message?.text;
        if (!senderId || !text) continue;
        const answer = await runRagForUser(pageRow.user_id as string, text);
        await sendMessengerMessage(pageRow.page_token as string, senderId, answer);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unexpected_error" }, { status: 500 });
  }
}


