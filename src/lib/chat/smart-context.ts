import { SupabaseClient } from "@supabase/supabase-js";
import { getTextEmbedding } from "@/lib/embeddings";
import logger from "../logger";

/**
 * HYBRID SMART CONTEXT SYSTEM
 * 
 * This module implements an intelligent context retrieval system that:
 * 1. Extracts customer facts (purchases, preferences) - ALWAYS relevant
 * 2. Includes recent context (last closed section) - Temporal relevance
 * 3. Uses semantic search ONLY when customer references history - Efficient
 * 
 * Benefits:
 * - Saves tokens: Only includes what's needed
 * - Smarter responses: Structured facts vs raw history
 * - Scalable: Won't break with long conversation histories
 */

export interface SmartContext {
  formattedContext: string;  // Ready-to-use context for LLM
  metadata: {
    hasPurchased: boolean;
    purchaseCount: number;
    referencesHistory: boolean;
    sectionsIncluded: number;
  };
}

/**
 * Main function: Gets hybrid context intelligently
 */
export async function getSmartContext(
  supabase: SupabaseClient,
  conversationId: string,
  currentMessage: string
): Promise<SmartContext> {
  logger.info(`🧠 Getting smart context for conversation ${conversationId}`);

  // Step 1: Extract customer facts (purchases, preferences)
  const customerFacts = await extractCustomerFacts(supabase, conversationId);
  
  // Step 2: Get recent context (last closed section only)
  const recentContext = await getLastClosedSection(supabase, conversationId);
  
  // Step 3: Detect if customer is referencing past conversations
  const needsHistory = detectHistoryReference(currentMessage);
  
  // Step 4: If needed, do semantic search for relevant past sections
  let historicalContext = "";
  let sectionsIncluded = 0;
  
  if (needsHistory) {
    logger.info(`📚 Customer referenced history, doing semantic search`);
    const searchResult = await semanticSearchSections(
      supabase, 
      conversationId, 
      currentMessage, 
      1 // Only get top 1 most relevant
    );
    historicalContext = searchResult.context;
    sectionsIncluded = searchResult.count;
  }

  // Step 5: Build structured context
  const contextParts: string[] = [];
  
  // Customer profile (if any purchases)
  if (customerFacts.hasPurchased) {
    contextParts.push(`👤 CUSTOMER PROFILE:`);
    contextParts.push(`- Returning customer with ${customerFacts.purchaseCount} previous order(s)`);
    if (customerFacts.purchaseSummary) {
      contextParts.push(`- Past purchases: ${customerFacts.purchaseSummary}`);
    }
    contextParts.push(''); // Empty line
  }
  
  // Recent conversation context
  if (recentContext) {
    contextParts.push(`💬 RECENT DISCUSSION:`);
    contextParts.push(recentContext);
    contextParts.push(''); // Empty line
  }
  
  // Historical context (only if referenced)
  if (historicalContext) {
    contextParts.push(`📖 RELEVANT HISTORY:`);
    contextParts.push(historicalContext);
    contextParts.push(''); // Empty line
  }

  const formattedContext = contextParts.join('\n');
  
  logger.info(`✅ Smart context built: ${contextParts.length > 0 ? 'has context' : 'empty'}`);
  
  return {
    formattedContext,
    metadata: {
      hasPurchased: customerFacts.hasPurchased,
      purchaseCount: customerFacts.purchaseCount,
      referencesHistory: needsHistory,
      sectionsIncluded,
    }
  };
}

/**
 * Step 1: Extract key facts about the customer
 * - How many purchases?
 * - What did they buy?
 * - Any patterns in their interests?
 */
async function extractCustomerFacts(
  supabase: SupabaseClient,
  conversationId: string
): Promise<{
  hasPurchased: boolean;
  purchaseCount: number;
  purchaseSummary: string | null;
}> {
  // Get all sections that resulted in purchases
  const { data: purchasedSections } = await supabase
    .from("chat_sections")
    .select("messages_summary, section_number")
    .eq("conversation_id", conversationId)
    .eq("purchased", true)
    .not("closed_at", "is", null)
    .order("section_number", { ascending: false })
    .limit(3); // Only last 3 purchases for summary

  if (!purchasedSections || purchasedSections.length === 0) {
    return {
      hasPurchased: false,
      purchaseCount: 0,
      purchaseSummary: null,
    };
  }

  // Extract product mentions from summaries (simple extraction)
  const productMentions = purchasedSections
    .map((s: any) => extractProductsFromSummary(s.messages_summary))
    .filter(Boolean)
    .join(", ");

  return {
    hasPurchased: true,
    purchaseCount: purchasedSections.length,
    purchaseSummary: productMentions || null,
  };
}

/**
 * Step 2: Get the most recent closed section
 * This provides immediate context from the last conversation
 * IMPORTANT: We summarize/truncate to avoid dumping huge conversation logs
 */
async function getLastClosedSection(
  supabase: SupabaseClient,
  conversationId: string
): Promise<string | null> {
  const { data: lastSection } = await supabase
    .from("chat_sections")
    .select("messages_summary, purchased, message_count")
    .eq("conversation_id", conversationId)
    .not("closed_at", "is", null)
    .order("section_number", { ascending: false })
    .limit(1);

  if (!lastSection || lastSection.length === 0) {
    return null;
  }

  const section = lastSection[0] as any;
  
  // Only include if it has actual content
  if (!section.messages_summary || section.messages_summary.trim().length === 0) {
    return null;
  }

  const summary = section.messages_summary;
  
  // SMART TRUNCATION: Only keep last 300 chars of recent discussion
  // This gives context without dumping the entire conversation
  let recentContext = summary.length > 300 
    ? "..." + summary.slice(-300) 
    : summary;
  
  // Add context about whether purchase happened
  if (section.purchased) {
    recentContext = `Last interaction ended with a purchase. Brief context: ${recentContext}`;
  }
  
  return recentContext;
}

/**
 * Step 3: Detect if customer is referencing past conversations
 * Uses keyword matching for efficiency
 */
function detectHistoryReference(message: string): boolean {
  const historyKeywords = [
    /last\s+time/i,
    /before/i,
    /previous(ly)?/i,
    /earlier/i,
    /you\s+(told|said|mentioned|recommended)/i,
    /remember\s+when/i,
    /we\s+(talked|discussed|spoke)/i,
    /my\s+(order|purchase)\b/i,
    /the\s+(other|last)\s+day/i,
  ];

  return historyKeywords.some(pattern => pattern.test(message));
}

/**
 * Step 4: Semantic search through previous sections
 * Only called when customer explicitly references history
 */
async function semanticSearchSections(
  supabase: SupabaseClient,
  conversationId: string,
  queryText: string,
  limit: number = 1
): Promise<{ context: string; count: number }> {
  try {
    // Get embedding for the query
    const queryEmbedding = await getTextEmbedding(queryText);
    
    // Get all closed sections with their summaries
    const { data: sections } = await supabase
      .from("chat_sections")
      .select("section_number, messages_summary, purchased")
      .eq("conversation_id", conversationId)
      .not("closed_at", "is", null)
      .not("messages_summary", "is", null)
      .order("section_number", { ascending: false });

    if (!sections || sections.length === 0) {
      return { context: "", count: 0 };
    }

    // For now, use a simple relevance check
    // In production, you'd calculate cosine similarity with stored embeddings
    // For this implementation, we'll use the most recent non-empty section
    const relevantSections = sections
      .filter((s: any) => s.messages_summary && s.messages_summary.trim().length > 0)
      .slice(0, limit);

    if (relevantSections.length === 0) {
      return { context: "", count: 0 };
    }

    const context = relevantSections
      .map((s: any) => {
        const purchaseTag = s.purchased ? " [PURCHASED]" : "";
        return `Section ${s.section_number}${purchaseTag}: ${s.messages_summary}`;
      })
      .join("\n");

    return { context, count: relevantSections.length };
  } catch (error) {
    logger.error("Error in semantic search:", error);
    return { context: "", count: 0 };
  }
}

/**
 * Helper: Extract product names from summary text
 * Simple pattern matching - can be enhanced with NLP
 */
function extractProductsFromSummary(summary: string): string {
  if (!summary) return "";
  
  // Try to extract product-like phrases (capitalized words, price mentions)
  const productPatterns = [
    // Products with prices: "Nike Shoes $120"
    /([A-Z][a-zA-Z\s]+)\s*\$[\d,]+/g,
    // Quoted products: "Red Jacket"
    /"([^"]+)"/g,
    // Products followed by common descriptors
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:in|for|at)/g,
  ];

  const matches: string[] = [];
  
  for (const pattern of productPatterns) {
    const found = [...summary.matchAll(pattern)];
    matches.push(...found.map(m => m[1]).filter(Boolean));
  }

  // Remove duplicates and limit
  const unique = [...new Set(matches)].slice(0, 3);
  
  return unique.length > 0 ? unique.join(", ") : "";
}

/**
 * Backward compatibility: Simple wrapper for existing code
 * This allows gradual migration
 */
export async function getPreviousSectionSummariesSmart(
  supabase: SupabaseClient,
  conversationId: string,
  currentMessage: string
): Promise<string> {
  const smartContext = await getSmartContext(supabase, conversationId, currentMessage);
  return smartContext.formattedContext;
}

