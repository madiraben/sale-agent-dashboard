import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildRagSystemPrompt } from "@/lib/prompts/rag";
import { getTextEmbedding } from "@/lib/embeddings";
import { withRateLimit, strictLimiter } from "@/lib/rate-limit";
import { validate, ragChatSchema } from "@/lib/validators";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import logger from "@/lib/logger";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (20 requests per minute)
    const rateLimitError = await withRateLimit(req, 20, strictLimiter);
    if (rateLimitError) return rateLimitError;

    // Parse and validate input
    const body = await req.json();
    const validation = validate(ragChatSchema, body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error },
        { status: 400 }
      );
    }

    const { query, conversationId: incomingConversationId } = validation.data;

    // Init supabase and identify user
    const supabase = await createSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("RAG Chat request", { userId, queryLength: query.length });

    // Create or load conversation
    let conversationId: string;
    let conversationSummary: string | null = null;
    
    if (incomingConversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("chat_conversations")
        .select("id, summary")
        .eq("id", incomingConversationId)
        .eq("user_id", userId) // Ensure ownership
        .single();
        
      if (!conv || convErr) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      
      conversationId = conv.id;
      conversationSummary = (conv as any)?.summary ?? null;
    } else {
      const { data: conv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({ user_id: userId, title: query.slice(0, 80) })
        .select("id, summary")
        .single();
        
      if (convErr || !conv) {
        logger.error("Failed to create conversation", { error: convErr });
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
      }
      
      conversationId = conv.id;
      conversationSummary = (conv as any)?.summary ?? null;
    }

    // Persist the user message immediately
    try {
      await supabase
        .from("chat_messages")
        .insert({ conversation_id: conversationId, role: "user", content: query })
        .select("id")
        .single();
    } catch (error) {
      logger.error("Failed to persist user message", { error });
    }

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

    // 1. Get query embedding with timeout
    let textEmbedding: number[];
    try {
      textEmbedding = await Promise.race([
        getTextEmbedding(query),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Embedding timeout")), 10000)
        ),
      ]);
      logger.info("Generated query embedding");
    } catch (error) {
      logger.error("Failed to generate embedding", { error });
      return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 });
    }

    // 2. Search for relevant products using RAG under the caller's session (RLS enforced)
    //    supabase already initialized with user session
    
    // Diagnostic: Check if user can access ANY products at all
    const { data: diagnosticProducts, error: diagnosticError } = await supabase
      .from("products")
      .select("id, name, embedding, tenant_id")
      .limit(5);
    console.log("🔍 Diagnostic - Direct product query:", { 
      count: diagnosticProducts?.length || 0, 
      hasEmbeddings: diagnosticProducts?.filter(p => p.embedding).length || 0,
      error: diagnosticError,
      sample: diagnosticProducts?.[0] 
    });
    
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

    // Debug: Log full results including errors
    console.log("🔍 Hybrid result:", hybridResult.status === "fulfilled" ? { data: (hybridResult.value as any)?.data, error: (hybridResult.value as any)?.error } : { rejected: (hybridResult as any).reason });
    console.log("🔍 Vector result:", vectorResult.status === "fulfilled" ? { data: (vectorResult.value as any)?.data, error: (vectorResult.value as any)?.error } : { rejected: (vectorResult as any).reason });
    
    const hybridData = (hybridResult.status === "fulfilled" && (hybridResult.value as any)?.data) || [];
    const vectorData = (vectorResult.status === "fulfilled" && (vectorResult.value as any)?.data) || [];

    const all = [...(hybridData || []), ...(vectorData || [])];
    console.log("🔍 All products:", all);
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

    // 4. Call OpenAI with RAG context
    // const trimmedHistory = conversationHistory.slice(-4);
    const messages: Message[] = [
      {
        role: "system",
        content: buildRagSystemPrompt(context),
      },
      // ...(conversationSummary ? [{ role: "system", content: `Conversation summary: ${conversationSummary}` } as Message] : []),
      // ...dbHistory as any,
      // ...trimmedHistory.map((msg: any) => ({
      //   role: msg.role,
      //   content: msg.content,
      // })),
      {
        role: "user",
        content: query,
      },
    ];
    logger.info("Calling OpenAI API (streaming)");
    const openaiResp = await fetchWithTimeout(
      process.env.OPENAI_BASE_URL + "/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 500,
          stream: true,
        }),
      },
      30000 // 30 second timeout
    );

    if (!openaiResp.ok || !openaiResp.body) {
      logger.error("OpenAI request failed", { status: openaiResp.status });
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
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
            logger.error("Stream error", { error: err });
            controller.error(err);
          });
        }
        read();
      },
      cancel() {
        logger.info("Stream cancelled");
      },
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
        await new Promise((r) => setTimeout(r, 100));
        
        if (assistantBuffer.current.trim().length > 0) {
          try {
            await supabase
              .from("chat_messages")
              .insert({
                conversation_id: conversationId,
                role: "assistant",
                content: assistantBuffer.current,
              })
              .select("id")
              .single();
              
            await supabase
              .from("chat_conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", conversationId);
          } catch (error) {
            logger.error("Failed to persist assistant message", { error });
          }
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
                ],
                temperature: 0.2,
                max_tokens: 120,
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
  } catch (error: any) {
    logger.error("RAG chat error", { message: error?.message, stack: error?.stack });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

