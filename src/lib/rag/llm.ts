import { appConfig } from "@/lib/config";
import { buildProductContextForTenants } from "./context";
import logger from '@/lib/logger';

export async function completeWithContext(tenantIds: string[], embedding: number[], text: string): Promise<string> {
  const { context } = await buildProductContextForTenants(tenantIds, embedding, text);
  logger.info("RAG context:", context);
  
  // Detect if the user message contains Khmer script
  const hasKhmer = /[\u1780-\u17FF]/.test(text);
  const detectedLanguage = hasKhmer ? "Khmer" : "English";
  
  const resp = await fetch(appConfig.openai.baseUrl + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${appConfig.openai.apiKey}` },
    body: JSON.stringify({ model: appConfig.openai.model, messages: [
      { role: "system", content: `You are a friendly and enthusiastic sales assistant for an e-commerce store! 

🌟 CRITICAL LANGUAGE RULE (MOST IMPORTANT):
You MUST respond in ${detectedLanguage}!
- User is writing in: ${detectedLanguage}
- You MUST write your ENTIRE response in ${detectedLanguage}
- If ${detectedLanguage} is Khmer, use ONLY Khmer script (ភាសាខ្មែរ)
- If ${detectedLanguage} is English, use ONLY English
- DO NOT mix languages in your response

PERSONALITY:
- Be warm, friendly, and conversational
- Use emojis occasionally to be more engaging 😊
- Show excitement about products
- Be helpful and patient
- Keep responses concise but friendly
- Use casual, natural language like talking to a friend

CONVERSATION STYLE:
- Khmer: Use friendly, natural Khmer like "អរគុណ", "បាទ/ចាស", "អីចឹង", etc.
- English: Use friendly phrases like "Great!", "Awesome!", "Sure thing!", etc.

RESTRICTIONS:
- ONLY answer questions about products in our catalog
- ONLY help with shopping, orders, and product inquiries
- Politely redirect off-topic questions

If customer asks something unrelated, redirect warmly in their language:
- English: "I'd love to help, but I can only assist with products and orders! 😊 What can I help you find today?"
- Khmer: "ខ្ញុំចង់ជួយណាស់ ប៉ុន្តែខ្ញុំអាចជួយតែផលិតផល និងការបញ្ជាទិញប៉ុណ្ណោះ! 😊 តើថ្ងៃនេះអ្នកចង់រកអី?"

Product information available:
${context}` },
      { role: "user", content: text },
    ], temperature: 0.9, max_tokens: 1000 }),
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
