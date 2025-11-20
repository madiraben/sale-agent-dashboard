import { appConfig } from "@/lib/config";
import logger from "@/lib/logger";

/**
 * Enhanced query result
 */
export type EnhancedQuery = {
  original: string;
  optimized: string;
  keywords: string[];
  intent: string;
};

/**
 * Enhance user query BEFORE embedding for better RAG/vector search accuracy
 * 
 * This optimizes the query text to be more "embedding-friendly":
 * - Extracts core semantic meaning
 * - Removes noise and filler words
 * - Expands with relevant context
 * - Normalizes language
 * 
 * Example:
 *   Input:  "hey do you guys have any red shirts in stock?"
 *   Output: "red shirt clothing apparel available stock"
 * 
 * This optimized text will produce better embeddings for vector search.
 */
export async function enhanceQueryForEmbedding(
  userQuery: string,
  conversationContext?: string
): Promise<EnhancedQuery> {
  try {
    logger.info(`🔍 Enhancing query for embedding: "${userQuery}"`);
    
    // Detect language
    const hasKhmer = /[\u1780-\u17FF]/.test(userQuery);
    const language = hasKhmer ? "Khmer" : "English";

    const systemPrompt = `You are a search query optimizer for e-commerce product search using vector embeddings.

Your job: Transform user queries into optimized text that will produce better semantic embeddings for vector search.

OPTIMIZATION RULES:
1. Extract ONLY the core product-related terms and attributes
2. Remove filler words: "I want", "do you have", "can I get", "please", "thanks", etc.
3. Remove questions words: "what", "where", "when", "how", "why"
4. Keep important attributes: colors, sizes, brands, materials, categories, features
5. Expand with synonyms and related terms (shirt → shirt blouse top clothing)
6. Add semantic context (running shoes → athletic footwear sports sneakers)
7. Normalize spellings and fix typos
8. If query mentions "this", "that", "it" - use conversation context to identify what they mean
9. Keep the language (${language}) but optimize for embedding

RETURN ONLY JSON:
{
  "optimized": "core semantic terms for embedding",
  "keywords": ["key", "terms", "extracted"],
  "intent": "brief description of what user wants"
}

EXAMPLES:

Input: "hey do you guys have any red shirts in stock?"
Output: {
  "optimized": "red shirt blouse top clothing apparel available",
  "keywords": ["red", "shirt", "clothing", "available"],
  "intent": "searching for red shirts"
}

Input: "what's the price of nike running shoes?"
Output: {
  "optimized": "nike running shoes athletic footwear sports sneakers price cost",
  "keywords": ["nike", "running", "shoes", "price"],
  "intent": "asking price of nike running shoes"
}

Input: "I'm looking for something comfortable for summer"
Output: {
  "optimized": "summer clothing comfortable light breathable casual wear",
  "keywords": ["summer", "comfortable", "clothing"],
  "intent": "searching for comfortable summer clothing"
}

Input: "do you have that in blue?" (with context)
Output: {
  "optimized": "[item from context] blue color variant",
  "keywords": ["blue", "color"],
  "intent": "asking for blue variant"
}

Input (Khmer): "តើមានអាវពណ៌ក្រហមទេ?"
Output: {
  "optimized": "អាវ ពណ៌ក្រហម សំលៀកបំពាក់",
  "keywords": ["អាវ", "ក្រហម"],
  "intent": "searching for red shirt"
}`;

    const userPrompt = conversationContext
      ? `Query: "${userQuery}"\n\nRecent conversation context:\n${conversationContext}\n\nOptimize this query for vector embedding search.`
      : `Query: "${userQuery}"\n\nOptimize this query for vector embedding search.`;

    const resp = await fetch(appConfig.openai.baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appConfig.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: appConfig.openai.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2, // Low temp for consistent optimization
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      logger.warn(`Query enhancement failed (${resp.status}), using original query`);
      return fallbackEnhancement(userQuery);
    }

    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content || "{}";
    
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      logger.error("Failed to parse enhancement JSON:", content);
      return fallbackEnhancement(userQuery);
    }

    const enhanced: EnhancedQuery = {
      original: userQuery,
      optimized: parsed.optimized || userQuery,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : extractSimpleKeywords(userQuery),
      intent: parsed.intent || "general query",
    };

    logger.info(`✨ Enhanced for embedding:`, {
      original: enhanced.original,
      optimized: enhanced.optimized,
      keywords: enhanced.keywords,
      intent: enhanced.intent,
    });

    return enhanced;
  } catch (error) {
    logger.error("Query enhancement error:", error);
    return fallbackEnhancement(userQuery);
  }
}

/**
 * Fallback enhancement when AI call fails
 */
function fallbackEnhancement(query: string): EnhancedQuery {
  const keywords = extractSimpleKeywords(query);
  
  return {
    original: query,
    optimized: query, // Use original
    keywords,
    intent: "query",
  };
}

/**
 * Simple keyword extraction fallback (no AI)
 */
function extractSimpleKeywords(text: string): string[] {
  // Remove common filler words
  const fillers = new Set([
    "i", "want", "need", "looking", "for", "do", "you", "have", "any",
    "can", "get", "please", "thanks", "thank", "hello", "hi", "hey",
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "what", "where", "when", "how", "why", "which", "who",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u1780-\u17FF]/g, " ") // Keep English, Khmer, remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 2 && !fillers.has(w));

  // Return unique keywords
  return Array.from(new Set(words)).slice(0, 10);
}

