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

/**
 * Search for products using intelligent search (semantic + keyword)
 */
export async function searchProducts(
  tenantIds: string[],
  query: string
): Promise<Product[]> {
  try {
    // First try direct database search with keyword matching
    const directResults = await searchProductsDirect(tenantIds, query);
    
    if (directResults.length > 0) {
      return directResults;
    }

    // If no results, try semantic search with AI
    return await searchProductsWithAI(tenantIds, query);
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
  
  // Try exact and partial matches
  const { data, error } = await admin
    .from("products")
    .select("id, name, description, price, stock, category_id, image_url")
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
 */
async function searchProductsWithAI(
  tenantIds: string[],
  query: string
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

Return ONLY a JSON array of product numbers (1-indexed) that match. If no matches, return [].
Example: [1, 3, 5]`;

    const userPrompt = `User is searching for: "${query}"

Available products:
${productList}

Which products match? Return product numbers only.`;

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
        ]
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
