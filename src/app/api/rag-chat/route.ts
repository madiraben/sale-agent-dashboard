import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTextEmbedding } from "@/lib/embeddings";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { query, conversationHistory = [] } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log("🤖 RAG Chat - Processing query:", query);

    // 1. Get query embedding (direct call, avoids internal HTTP)
    const textEmbedding = await getTextEmbedding(query);
    console.log("✅ Got query embedding");

    // 2. Search for relevant products using RAG
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Parallel retrieval: hybrid and vector searches together, then merge
    let products: any[] = [];
    let searchMethod = "parallel";
    const [hybridResult, vectorResult] = await Promise.allSettled([
      supabase.rpc("search_products_hybrid_text", {
        query_text: query,
        query_embedding: textEmbedding,
        match_threshold: 0.2,
        match_count: 10,
      }),
      supabase.rpc("search_products_by_embedding", {
        query_embedding: textEmbedding,
        match_threshold: 0.3,
        match_count: 10,
      }),
    ]);

    const hybridData = (hybridResult.status === "fulfilled" && (hybridResult.value as any)?.data) || [];
    const vectorData = (vectorResult.status === "fulfilled" && (vectorResult.value as any)?.data) || [];

    const all = [...(hybridData || []), ...(vectorData || [])];
    const byId = new Map<string, any>();
    for (const item of all) {
      if (!item) continue;
      const prev = byId.get(item.id);
      if (!prev || (item.similarity ?? 0) > (prev.similarity ?? 0)) {
        byId.set(item.id, item);
      }
    }
    products = Array.from(byId.values())
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, 5);
    if (products.length === 0) {
      const { data: allProducts } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, embedding")
        .not("embedding", "is", null);
      if (allProducts && allProducts.length) {
        products = (allProducts as any[])
          .map((p: any) => {
            if (!p.embedding) return null;
            let dot = 0, a = 0, b = 0;
            for (let i = 0; i < textEmbedding.length; i++) {
              dot += textEmbedding[i] * p.embedding[i];
              a += textEmbedding[i] * textEmbedding[i];
              b += p.embedding[i] * p.embedding[i];
            }
            const sim = dot / (Math.sqrt(a) * Math.sqrt(b));
            return sim > 0.1 ? { ...p, similarity: sim } : null;
          })
          .filter(Boolean)
          .slice(0, 5) as any[];
      }
    }

    // 3. Build trimmed context for OpenAI
    const context = products && products.length > 0
      ? products
          .map((p: any, i: number) => `#${i + 1} ${p.name} - $${p.price}\nKey: ${(p.description || "").slice(0, 140)}`)
          .join("\n")
      : "No relevant products found.";

    // 4. Call OpenAI with RAG context
    const trimmedHistory = conversationHistory.slice(-4);
    const messages: Message[] = [
      {
        role: "system",
        content: `You are a concise product assistant. Use only the provided catalog.\nCatalog:\n${context}\nRules: reference product names and prices; keep under 160 words; do not invent details.`,
      },
      ...trimmedHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: query,
      },
    ];

    console.log("🌐 Calling OpenAI (streaming)...");
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const openaiResp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: true,
      }),
    });

    if (!openaiResp.ok || !openaiResp.body) {
      let details: any = null;
      try { details = await openaiResp.json(); } catch {}
      console.error("OpenAI error:", details || openaiResp.statusText);
      throw new Error("OpenAI API failed");
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Send initial products payload
        const initEvent = `data: ${JSON.stringify({ type: "products", products, debug: { productsFound: products.length, topSimilarity: products?.[0]?.similarity || 0, searchMethod } })}\n\n`;
        controller.enqueue(encoder.encode(initEvent));

        const reader = openaiResp.body!.getReader();
        let buffer = "";
        function read() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "end" })}\n\n`));
              controller.close();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const delta = json?.choices?.[0]?.delta?.content;
                if (typeof delta === "string" && delta.length > 0) {
                  const evt = `data: ${JSON.stringify({ type: "chunk", content: delta })}\n\n`;
                  controller.enqueue(encoder.encode(evt));
                }
              } catch {}
            }
            read();
          }).catch((err) => {
            controller.error(err);
          });
        }
        read();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("❌ RAG chat error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

