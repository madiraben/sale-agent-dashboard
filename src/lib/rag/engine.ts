import { getTextEmbedding } from "@/lib/embeddings";
import { completeWithContext } from "@/lib/rag/llm";
import logger from '@/lib/logger';

export async function runRagForUserTenants(tenantIds: string[], text: string): Promise<string> {
  try {
    const embedding = await getTextEmbedding(text);
    logger.info("Embedding:", embedding);
    const reply = await completeWithContext(tenantIds, embedding, text);
    logger.info("RAG reply:", reply);
    return reply;
  } catch (error) {
    logger.error("Error running RAG:", error as Error);
    return "Sorry, I couldn't process your request.";
  }
}

