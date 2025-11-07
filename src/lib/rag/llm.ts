import { appConfig } from "@/lib/config";
import { buildProductContextForTenants } from "./context";
import logger from '@/lib/logger';

export async function completeWithContext(tenantIds: string[], embedding: number[], text: string): Promise<string> {
  const { context } = await buildProductContextForTenants(tenantIds, embedding, text);
  logger.info("RAG context:", context);
  const resp = await fetch(appConfig.openai.baseUrl + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${appConfig.openai.apiKey}` },
    body: JSON.stringify({ model: appConfig.openai.model, messages: [
      { role: "system", content: `You are a helpful sales assistant for an e-commerce store. 

IMPORTANT RESTRICTIONS:
- ONLY answer questions about the products in our catalog
- ONLY help with shopping, orders, and product inquiries
- DO NOT answer general knowledge questions
- DO NOT provide advice on topics unrelated to our products
- DO NOT engage in conversations about politics, health, personal matters, etc.

If a customer asks something unrelated to products or shopping, politely redirect them:
"I can only help with product questions and orders. What products can I help you find?"

Use the following product context to answer succinctly:

${context}` },
      { role: "user", content: text },
    ], temperature: 0.7, max_tokens: 1000 }),
  });
  let tokensUsed = "0";
  // Try to read from response headers first (e.g., x-openai-tokens), otherwise fall back to JSON usage fields
  tokensUsed = resp.headers.get("x-openai-tokens") || "0";
  const j = await resp.json().catch(() => null);
  if (j?.usage && typeof j.usage.total_tokens === "number") {
    tokensUsed = j.usage.total_tokens.toString();
  }
  logger.info("Number of tokens used:", tokensUsed);
  const reply = j?.choices?.[0]?.message?.content || "Sorry, I couldn't find that.";
  return reply;
}
