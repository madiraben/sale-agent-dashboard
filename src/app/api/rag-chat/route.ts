import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildRagSystemPrompt } from "@/lib/prompts/rag";
import { getTextEmbedding } from "@/lib/embeddings";
import {
  checkAndCloseInactiveSection,
  updateConversationActivity,
  detectPurchaseIntent,
  markConversationAsPurchased,
  getPreviousSectionSummaries,
  ensureCurrentSection,
} from "@/lib/chat/session-manager";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { query, conversationHistory = [], conversationId: incomingConversationId } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log("🤖 RAG Chat - Processing query:", query);

    // 0. Init supabase and identify user
    const supabase = await createSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create or load conversation
    let conversationId: string | null = null;
    let conversationSummary: string | null = null;
    let currentSectionNumber = 1;
    let purchased = false;

    if (incomingConversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("chat_conversations")
        .select("id, summary")
        .eq("id", incomingConversationId)
        .single();
      if (!conv || convErr) {
        return NextResponse.json({ error: "conversation_not_found" }, { status: 404 });
      }
      conversationId = conv.id;
      conversationSummary = (conv as any)?.summary ?? null;
      purchased = (conv as any)?.purchased ?? false;

      // Check if 5 minutes have passed since last activity
      const { shouldCreateNewSection, currentSectionNumber: newSectionNumber } = 
        await checkAndCloseInactiveSection(supabase, conv.id);

      if (shouldCreateNewSection) {
        currentSectionNumber = newSectionNumber;
        // Update conversation with new section number
        await supabase
          .from("chat_conversations")
          .update({ 
            current_section_number: currentSectionNumber,
            // Reset purchased if moving to a new section after purchase
            purchased: purchased && currentSectionNumber > 1 ? false : purchased
          })
          .eq("id", conversationId);
        
        // If purchased and starting new section, reset the flag
        if (purchased && currentSectionNumber === 1) {
          purchased = false;
        }
      } else {
        currentSectionNumber = (conv as any)?.current_section_number || 1;
      }
    } else {
      // New conversation
      const { data: conv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({ 
          user_id: userId, 
          title: (query as string).slice(0, 80),
          current_section_number: 1,
          purchased: false,
          last_activity_at: new Date().toISOString()
        })
        .select("id, summary, current_section_number, purchased")
        .single();
      if (convErr || !conv) throw new Error("create_conversation_failed");
      conversationId = conv.id;
      conversationSummary = (conv as any)?.summary ?? null;
      currentSectionNumber = 1;
      purchased = false;
    }

    // Guard against null conversationId
    if (!conversationId) {
      throw new Error("Failed to create or load conversation");
    }

    // Ensure current section exists in database
    const sectionId = await ensureCurrentSection(supabase, conversationId, currentSectionNumber, purchased);

    // Detect purchase intent in the user's message
    const isPurchaseDetected = detectPurchaseIntent(query);
    if (isPurchaseDetected && !purchased) {
      await markConversationAsPurchased(supabase, conversationId);
      purchased = true;
      console.log("🛒 Purchase detected in message!");
    }

    // Persist the user message immediately with section link
    try {
      await supabase.from("chat_messages").insert({ 
        conversation_id: conversationId, 
        role: "user", 
        content: query,
        section_id: sectionId 
      }).select("id").single();
    } catch {}

    // Update last activity time
    await updateConversationActivity(supabase, conversationId, currentSectionNumber);

    // Load recent history for this conversation (server-trusted under RLS)
    const { data: priorMessages } = await supabase
      .from("chat_messages")
      .select("role,content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);

    // Build trimmed history: summary + last 6 messages
    // const recentHistory = (priorMessages || []).slice(-6);
    // const dbHistory = recentHistory.map((m: any) => ({ role: m.role, content: m.content }));

    // 1. Get query embedding (direct call, avoids internal HTTP)
    const textEmbedding = await getTextEmbedding(query);
    console.log("✅ Got query embedding");

    // 2. Search for relevant products using RAG under the caller's session (RLS enforced)
    //    supabase already initialized with user session
    
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
    // console.log("🔍 All products:", all);
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
    // Optional fallback was removed to prevent cross-tenant leakage when RLS is misconfigured
    console.log("🔍 Products:", products);
    // 3. Build trimmed context for OpenAI
    const context = products && products.length > 0
      ? products
          .map((p: any, i: number) => {
            const categoryName = (p?.product_categories && p.product_categories?.name) || p?.category || p?.category_name || null;
            const categoryLine = categoryName ? `\nCategory: ${categoryName}` : "";
            const sizeLine = p?.size ? `\nSize: ${p.size}` : "";
            const imageUrl = p?.image_url;
            return `#${i + 1} ${p.name} - $${p.price}${categoryLine}${sizeLine}\nKey: ${(p.description || "").slice(0, 140)}${imageUrl ? `\nImage: ${imageUrl}` : ""} ${p.sku ? `\nSKU: ${p.sku}` : ""}  ${p.stock ? `\nStock: ${p.stock}` : ""}`;
          })
          .join("\n")
      : "No relevant products found.";

    // 4. Get previous section summaries for memory/context
    const previousSectionsSummary = await getPreviousSectionSummaries(supabase, conversationId);
    console.log("📝 Previous sections:", previousSectionsSummary ? "Found" : "None");

    // 5. Call OpenAI with RAG context + section memory
    const messages: Message[] = [
      {
        role: "system",
        content: buildRagSystemPrompt(context, previousSectionsSummary),
      },
      {
        role: "user",
        content: query,
      },
    ];
    console.log("🌐 Messages:", messages);
    console.log("🌐 Calling OpenAI (streaming)...");
    const openaiResp = await fetch(process.env.OPENAI_BASE_URL + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL, messages, stream: true }),
    });

    if (!openaiResp.ok || !openaiResp.body) {
      let details: any = null;
      try { details = await openaiResp.json(); } catch {}
      console.error("OpenAI error:", details || openaiResp.statusText);
      throw new Error("OpenAI API failed");
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    // Use a mutable object to track the assistant's response across stream chunks
    const assistantBuffer = { current: "" };

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Send initial products payload
        const initEvent = `data: ${JSON.stringify({ type: "products", products, conversationId, debug: { productsFound: products.length, topSimilarity: products?.[0]?.similarity || 0, searchMethod } })}\n\n`;
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
                  assistantBuffer.current += delta;
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
      cancel() {},
    });

    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

    // After response is sent, persist assistant message and optionally update summary
    response.headers; // touch to ensure variable is used
    (async () => {
      try {
        // Wait briefly to allow buffer to collect during stream; then save
        await new Promise((r) => setTimeout(r, 50));
        if (assistantBuffer.current.trim().length > 0) {
          try {
            await supabase.from("chat_messages").insert({ 
              conversation_id: conversationId, 
              role: "assistant", 
              content: assistantBuffer.current,
              section_id: sectionId 
            }).select("id").single();
          } catch {}
          
          // Update conversation activity
          await updateConversationActivity(supabase, conversationId, currentSectionNumber);
        }

        // Lightweight summarization trigger every ~12 messages
        const { count } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversationId);
        if ((count ?? 0) >= 12 && (assistantBuffer.current.trim().length ?? 0) > 0) {
          const summaryInput = `${conversationSummary ? `Existing summary: ${conversationSummary}\n` : ""}Latest assistant reply: ${assistantBuffer.current.trim()}`.slice(0, 4000);
          try {
            const baseUrl = process.env.OPENAI_BASE_URL;
            const sumResp = await fetch(`${baseUrl}/chat/completions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: process.env.OPENAI_MODEL,
                messages: [
                  { role: "system", content: "Summarize the conversation context in ≤60 words, keep key entities and intent." },
                  { role: "user", content: summaryInput },
                ]
              }),
            });
            const sumJson = await sumResp.json().catch(() => null);
            const newSummary = sumJson?.choices?.[0]?.message?.content || null;
            if (newSummary) {
              await supabase.from("chat_conversations").update({ summary: newSummary }).eq("id", conversationId);
            }
          } catch {}
        }
      } catch (e) {
        console.warn("post-stream-persist-failed", (e as any)?.message);
      }
    })();

    return response;
  } catch (err: any) {
    console.error("❌ RAG chat error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

