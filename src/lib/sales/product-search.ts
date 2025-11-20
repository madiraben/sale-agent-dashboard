import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appConfig } from "@/lib/config";
import logger from "@/lib/logger";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category_id: string | null;
  image_url: string | null;
};

export type EnhancedQuery = {
  original: string;
  enhanced: string;
  keywords: string[];
  context?: string;
};

/**
 * Enhance user query using AI to improve RAG accuracy
 * This extracts key terms, adds synonyms, and normalizes the query
 */
export async function enhanceSearchQuery(
  query: string,
  conversationContext?: string
): Promise<EnhancedQuery> {
  try {
    logger.info(`🧠 Enhancing search query: "${query}"`);
    
    const systemPrompt = `You are a search query optimizer for an e-commerce platform. Your job is to enhance user queries to improve product search accuracy.

Given a user's search query (and optional conversation context), extract and enhance the search terms.

Return ONLY a JSON object with this structure:
{
  "enhanced": "optimized search query with key terms and synonyms",
  "keywords": ["key", "search", "terms"],
  "context": "brief context summary if relevant"
}

RULES:
- Extract core product attributes (type, color, size, brand, material, etc.)
- Expand with synonyms (e.g., "shirt" → "shirt, t-shirt, blouse, top")
- Fix typos and normalize spellings
- Remove filler words (I want, looking for, can I, etc.)
- Keep it concise but comprehensive
- If user is vague, use context to clarify
- Return empty keywords if query is not product-related

Examples:
Input: "I want a red shirt"
Output: {"enhanced": "red shirt t-shirt blouse top", "keywords": ["red", "shirt", "t-shirt", "top"], "context": "color: red, type: shirt"}

Input: "do you have nike shoes size 10?"
Output: {"enhanced": "nike shoes sneakers footwear size 10", "keywords": ["nike", "shoes", "sneakers", "size 10"], "context": "brand: nike, type: shoes, size: 10"}

Input: "something for running"
Output: {"enhanced": "running shoes sneakers athletic footwear sportswear", "keywords": ["running", "shoes", "athletic", "sportswear"], "context": "purpose: running"}`;

    const userPrompt = conversationContext 
      ? `Query: "${query}"\n\nRecent conversation:\n${conversationContext}\n\nEnhance this query for product search.`
      : `Query: "${query}"\n\nEnhance this query for product search.`;

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
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      logger.warn("Query enhancement failed, using original query");
      return {
        original: query,
        enhanced: query,
        keywords: [query],
      };
    }

    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    const enhanced: EnhancedQuery = {
      original: query,
      enhanced: parsed.enhanced || query,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [query],
      context: parsed.context,
    };

    logger.info(`✨ Enhanced query:`, {
      original: enhanced.original,
      enhanced: enhanced.enhanced,
      keywords: enhanced.keywords,
      context: enhanced.context,
    });

    return enhanced;
  } catch (error) {
    logger.error("Query enhancement error:", error);
    // Fallback to original query
    return {
      original: query,
      enhanced: query,
      keywords: [query],
    };
  }
}

/**
 * Search for products using intelligent search (semantic + keyword)
 * Now with query enhancement for better RAG accuracy
 */
export async function searchProducts(
  tenantIds: string[],
  query: string,
  conversationContext?: string
): Promise<Product[]> {
  try {
    logger.info(`🔍 Product search - Query: "${query}", TenantIDs: [${tenantIds.join(", ")}]`);
    
    // 🚀 NEW: Enhance query with AI before searching
    const enhancedQuery = await enhanceSearchQuery(query, conversationContext);
    
    // First try direct database search with enhanced query
    const directResults = await searchProductsDirect(tenantIds, enhancedQuery.enhanced);
    
    if (directResults.length > 0) {
      logger.info(`✅ Direct search found ${directResults.length} products:`, directResults.map(p => `${p.name} (tenant: ${(p as any).tenant_id || 'unknown'})`));
      return directResults;
    }

    // If enhanced query didn't work, try with keywords
    if (enhancedQuery.keywords.length > 0) {
      for (const keyword of enhancedQuery.keywords) {
        const keywordResults = await searchProductsDirect(tenantIds, keyword);
        if (keywordResults.length > 0) {
          logger.info(`✅ Keyword search "${keyword}" found ${keywordResults.length} products`);
          return keywordResults;
        }
      }
    }

    // If no results, try semantic search with AI using enhanced query
    logger.info("⚠️ No direct matches, trying AI search with enhanced query...");
    const aiResults = await searchProductsWithAI(tenantIds, enhancedQuery.enhanced, enhancedQuery.keywords);
    logger.info(`✅ AI search found ${aiResults.length} products`);
    return aiResults;
  } catch (error) {
    logger.error("Product search error:", error);
    return [];
  }
}

/**
 * Direct database search with keyword matching
 */
async function searchProductsDirect(
  tenantIds: string[],
  query: string
): Promise<Product[]> {
  const admin = createSupabaseAdminClient();
  const cleaned = query.trim().toLowerCase();
  
  // Try exact and partial matches (include tenant_id for debugging)
  const { data, error } = await admin
    .from("products")
    .select("id, name, description, price, stock, category_id, image_url, tenant_id")
    .in("tenant_id", tenantIds)
    .or(`name.ilike.%${cleaned}%,description.ilike.%${cleaned}%`)
    .gt("stock", 0)
    .order("name", { ascending: true })
    .limit(10);
  
  if (error) {
    logger.error("Direct search error:", error);
    return [];
  }
  
  return (data || []) as Product[];
}

/**
 * AI-powered semantic search for products
 * Now enhanced with keywords for better matching
 */
async function searchProductsWithAI(
  tenantIds: string[],
  query: string,
  keywords?: string[]
): Promise<Product[]> {
  try {
    // Get all products from database first
    const admin = createSupabaseAdminClient();
    const { data: allProducts, error } = await admin
      .from("products")
      .select("id, name, description, price, stock, category_id, image_url")
      .in("tenant_id", tenantIds)
      .gt("stock", 0)
      .limit(100);

    if (error || !allProducts || allProducts.length === 0) {
      return [];
    }

    // Use AI to match query with products
    const productList = allProducts
      .map((p: any, idx) => `${idx + 1}. ${p.name} - $${p.price} ${p.description ? `- ${p.description}` : ''}`)
      .join('\n');

    const systemPrompt = `You are a product search assistant. Given a user's search query and a list of products, identify which products best match the query.

Consider:
- Exact name matches (highest priority)
- Description matches
- Semantic similarity
- Category/type matches
- Keywords provided

Return ONLY a JSON array of product numbers (1-indexed) that match. If no matches, return [].
Return products in order of relevance (best match first).
Example: [1, 3, 5]`;

    const keywordInfo = keywords && keywords.length > 0 
      ? `\n\nKey search terms: ${keywords.join(", ")}`
      : "";

    const userPrompt = `User is searching for: "${query}"${keywordInfo}

Available products:
${productList}

Which products match? Return product numbers only in order of relevance.`;

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
        temperature: 0,
        max_tokens: 150,
      }),
    });

    if (!resp.ok) {
      logger.error("AI search API error:", resp.statusText);
      return [];
    }

    const j = await resp.json();
    const text = j?.choices?.[0]?.message?.content || "[]";
    const indices = JSON.parse(text.trim());

    if (!Array.isArray(indices)) {
      return [];
    }

    // Map indices to products (convert from 1-indexed to 0-indexed)
    const matchedProducts = indices
      .filter((idx: number) => idx > 0 && idx <= allProducts.length)
      .map((idx: number) => allProducts[idx - 1] as Product)
      .slice(0, 5); // Max 5 results

    return matchedProducts;
  } catch (error) {
    logger.error("AI search error:", error);
    return [];
  }
}

/**
 * Get product by exact ID
 */
export async function getProductById(
  tenantIds: string[],
  productId: string
): Promise<Product | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("id, name, description, price, stock, category_id, image_url")
    .in("tenant_id", tenantIds)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    logger.error("Get product by ID error:", error);
    return null;
  }

  return data as Product | null;
}

/**
 * Get multiple products by IDs
 */
export async function getProductsByIds(
  tenantIds: string[],
  productIds: string[]
): Promise<Product[]> {
  if (productIds.length === 0) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("id, name, description, price, stock, category_id, image_url")
    .in("tenant_id", tenantIds)
    .in("id", productIds);

  if (error) {
    logger.error("Get products by IDs error:", error);
    return [];
  }

  return (data || []) as Product[];
}

/**
 * Get products for cart items (fetches fresh data from DB)
 */
export async function getCartProducts(
  tenantIds: string[],
  cartItems: Array<{ product_id: string; qty: number }>
): Promise<Array<{ product: Product; qty: number }>> {
  const productIds = cartItems.map(item => item.product_id);
  const products = await getProductsByIds(tenantIds, productIds);

  // Map products to cart items
  const result = cartItems
    .map(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        return { product, qty: item.qty };
      }
      return null;
    })
    .filter((item): item is { product: Product; qty: number } => item !== null);

  return result;
}

/**
 * Validate product availability and stock
 */
export async function validateProductAvailability(
  tenantIds: string[],
  productId: string,
  requestedQty: number
): Promise<{ available: boolean; reason?: string; product?: Product }> {
  const product = await getProductById(tenantIds, productId);

  if (!product) {
    return { available: false, reason: "Product not found" };
  }

  if (product.stock < requestedQty) {
    return {
      available: false,
      reason: `Only ${product.stock} in stock`,
      product,
    };
  }

  return { available: true, product };
}

/**
 * Format product for display
 */
export function formatProductDisplay(product: Product, qty: number = 1): string {
  const total = product.price * qty;
  return `${qty}x ${product.name} ($${product.price.toFixed(2)} each) = $${total.toFixed(2)}`;
}

/**
 * Format multiple products for display
 */
export function formatCartDisplay(items: Array<{ product: Product; qty: number }>): string {
  if (items.length === 0) return "Your cart is empty.";

  const lines = items.map((item, idx) =>
    `${idx + 1}. ${formatProductDisplay(item.product, item.qty)}`
  );

  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  lines.push(`\n💰 Total: $${total.toFixed(2)}`);

  return lines.join("\n");
}

/**
 * Format pending product options for display
 */
export function formatPendingProducts(pending: Array<{ query: string; results: Product[] }>): string {
  let output = "";
  pending.forEach((search) => {
    output += `For "${search.query}":\n`;
    search.results.forEach((product, idx) => {
      output += `  ${idx + 1}. ${product.name} - $${product.price.toFixed(2)}`;
      if (product.description) {
        output += ` - ${product.description.substring(0, 50)}${product.description.length > 50 ? '...' : ''}`;
      }
      output += `\n`;
    });
    output += "\n";
  });
  return output;
}
