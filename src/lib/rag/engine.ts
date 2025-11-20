import { getTextEmbedding } from "@/lib/embeddings";
import { completeWithContext } from "@/lib/rag/llm";
import { enhanceQueryForEmbedding } from "@/lib/rag/query-enhancer";
import logger from '@/lib/logger';

/**
 * Run RAG for user with query enhancement
 * 
 * Flow:
 * 1. Enhance user query (optimize for embeddings)
 * 2. Generate embedding from optimized query
 * 3. Search vector database
 * 4. Generate contextualized response
 */
export async function runRagForUserTenants(
  tenantIds: string[], 
  text: string,
  conversationContext?: string
): Promise<string> {
  try {
    // 🚀 STEP 1: Enhance query BEFORE embedding for better results
    const enhanced = await enhanceQueryForEmbedding(text, conversationContext);
    
    logger.info("RAG Query Enhancement:", {
      original: enhanced.original,
      optimized: enhanced.optimized,
      improvement: enhanced.optimized !== enhanced.original ? "✅ Enhanced" : "→ No change",
    });
    
    // 🚀 STEP 2: Embed the OPTIMIZED query (not the original)
    // This produces better vector representations for semantic search
    const embedding = await getTextEmbedding(enhanced.optimized);
    logger.info("Generated embedding from optimized query");
    
    // 🚀 STEP 3 & 4: Search and generate response
    // Pass BOTH optimized query (for hybrid text search) and original (for LLM context)
    const reply = await completeWithContext(
      tenantIds, 
      embedding, 
      text, // Original query for LLM to understand user intent
      enhanced.optimized // Optimized query for hybrid text search
    );
    logger.info("RAG reply:", reply);
    
    return reply;
  } catch (error) {
    logger.error("Error running RAG:", error as Error);
    return "Sorry, I couldn't process your request.";
  }
}

