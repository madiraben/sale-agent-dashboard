import { getTextEmbedding } from "@/lib/embeddings";
import { buildProductContextForTenants } from "@/lib/rag/context";
import { completeWithContext } from "@/lib/rag/llm";
import { buildRagSystemPrompt } from "@/lib/prompts/rag";

export async function runRagForUserTenants(userId: string, tenantIds: string[], text: string): Promise<string> {
  const embedding = await getTextEmbedding(text);
  const { context } = await buildProductContextForTenants(tenantIds, embedding, text);
  const system = `You are a helpful sales assistant. Use the following product context to answer succinctly.\n\n${context}`;
  const reply = await completeWithContext(system, text);
  return reply;
}

/**
 * Enhanced version with previous sections context for memory
 */
export async function runRagWithContext(
  userId: string,
  tenantIds: string[],
  text: string,
  previousSectionsContext: string
): Promise<string> {
  const embedding = await getTextEmbedding(text);
  const { context } = await buildProductContextForTenants(tenantIds, embedding, text);
  
  // Use the enhanced system prompt that includes previous sections
  const system = buildRagSystemPrompt(context, previousSectionsContext);
  const reply = await completeWithContext(system, text);
  return reply;
}


