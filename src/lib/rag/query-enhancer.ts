import { appConfig } from "@/lib/config";
import logger from "@/lib/logger";
import { getCachedEnhancement, cacheEnhancement } from "./query-cache";

/**
 * Enhanced query result
 */
export type EnhancedQuery = {
  original: string;
  optimized: string;
  keywords: string[];
  intent: string;
  wasEnhanced: boolean; // Track if query was actually enhanced
};

/**
 * Simple pattern-based check: Does this query need AI enhancement?
 * Skip enhancement for simple, clear queries to save ~300ms
 */
function shouldSkipEnhancement(query: string): boolean {
  const trimmed = query.trim();
  
  // Skip if very short (likely a simple keyword search)
  if (trimmed.length < 10) {
    return true;
  }
  
  // Skip if it's a single word or 2-3 simple words
  const words = trimmed.split(/\s+/);
  if (words.length <= 2) {
    return true;
  }
  
  // Skip if it's already optimized (no filler words)
  const hasFillers = /\b(i want|do you have|can i get|looking for|show me|hey|hello|please|thanks)\b/i.test(trimmed);
  if (!hasFillers && words.length <= 5) {
    return true; // Already concise
  }
  
  return false;
}

export async function enhanceQueryForEmbedding(
  userQuery: string,
  conversationContext?: string
): Promise<EnhancedQuery> {
  try {
  
    const cached = getCachedEnhancement(userQuery, conversationContext);
    if (cached) {
      return cached;
    }

    if (shouldSkipEnhancement(userQuery)) {
      logger.info(`⚡ Skipping enhancement for simple query: "${userQuery}"`);
      const result = fallbackEnhancement(userQuery, true);
      cacheEnhancement(userQuery, result, conversationContext);
      return result;
    }
    
    logger.info(`🔍 Enhancing query for embedding: "${userQuery}"`);
    
    // Detect language
    const hasKhmer = /[\u1780-\u17FF]/.test(userQuery);
    const language = hasKhmer ? "Khmer" : "English";

    const systemPrompt = `Transform user query into optimized search terms for vector embeddings.

RULES:
- Remove filler words (I want, do you have, etc.)
- Extract core product terms and attributes
- Add 2-3 relevant synonyms
- Keep ${language} language

RETURN JSON:
{
  "optimized": "core terms synonyms",
  "keywords": ["term1", "term2"],
  "intent": "brief intent"
}

Examples:
"red shirt" → {"optimized": "red shirt blouse top", "keywords": ["red","shirt"], "intent": "search"}
"nike shoes" → {"optimized": "nike shoes sneakers footwear", "keywords": ["nike","shoes"], "intent": "search"}`;

    const userPrompt = conversationContext
      ? `Query: "${userQuery}"\nContext: ${conversationContext.slice(0, 200)}\n\nOptimize:`
      : `Query: "${userQuery}"\n\nOptimize:`;

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
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      logger.warn(`Query enhancement failed (${resp.status}), using fallback`);
      return fallbackEnhancement(userQuery, false);
    }

    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content || "{}";
    
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      logger.error("Failed to parse enhancement JSON");
      return fallbackEnhancement(userQuery, false);
    }

    const enhanced: EnhancedQuery = {
      original: userQuery,
      optimized: parsed.optimized || userQuery,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : extractSimpleKeywords(userQuery),
      intent: parsed.intent || "query",
      wasEnhanced: true,
    };

    logger.info(`✨ Enhanced (${json.usage?.total_tokens || '?'} tokens):`, {
      optimized: enhanced.optimized,
      keywords: enhanced.keywords,
    });

    // Cache for future use
    cacheEnhancement(userQuery, enhanced, conversationContext);

    return enhanced;
  } catch (error) {
    logger.error("Query enhancement error:", error);
    return fallbackEnhancement(userQuery, false);
  }
}

/**
 * Fallback enhancement when AI call fails or is skipped
 */
function fallbackEnhancement(query: string, wasSkipped: boolean): EnhancedQuery {
  const keywords = extractSimpleKeywords(query);
  
  return {
    original: query,
    optimized: query, // Use original
    keywords,
    intent: "query",
    wasEnhanced: !wasSkipped,
  };
}

/**
 * Simple keyword extraction fallback (no AI)
 * Fast, deterministic extraction for simple queries
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
