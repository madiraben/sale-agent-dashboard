import { SupabaseClient } from "@supabase/supabase-js";

export interface CustomerInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface OrderProduct {
  product_id: string;
  name: string;
  price: number;
  qty: number;
}

/**
 * Extracts customer information from a message
 * Looks for patterns like "Name: John", "Phone: 123", etc.
 */
export function extractCustomerInfo(message: string): CustomerInfo {
  const info: CustomerInfo = {};

  // Extract name
  const nameMatch = message.match(/\b(?:name|customer name|full name)[:\s\-]+([^\n,]+)/i);
  if (nameMatch) {
    info.name = nameMatch[1].trim();
  }

  // Extract phone (flexible international formats)
  const phoneMatch = message.match(/\b(?:phone|tel|mobile|contact)[:\s\-]+([+\d\s\-()]+)/i) ||
                     message.match(/(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{0,4})/);
  if (phoneMatch) {
    info.phone = phoneMatch[phoneMatch.length - 1].trim();
  }

  // Extract email
  const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) {
    info.email = emailMatch[0];
  }

  // Extract address (everything after "address:" or similar)
  const addressMatch = message.match(/\b(?:address|location|destination|deliver to|ship to)[:\s\-]+([^\n]+)/i);
  if (addressMatch) {
    info.address = addressMatch[1].trim();
  }

  return info;
}

/**
 * Parses order details from conversation messages using LLM
 * Extracts ONLY the products the customer confirmed to order
 */
export async function extractOrderProducts(conversationSummary: string): Promise<OrderProduct[]> {
  const { completeWithContext } = await import("@/lib/rag/llm");
  
  const extractionPrompt = `Analyze this conversation and extract ONLY the products the customer CONFIRMED they want to order (not just products they asked about or browsed).

Look for:
- Clear purchase intent ("I'll take", "I want to order", "Add to cart", "yes", "confirmed")
- Final quantities and sizes the customer selected
- Products mentioned in the ORDER CONFIRMATION or FINAL SUMMARY

DO NOT INCLUDE:
- Products the customer only asked about
- Products mentioned in browsing/comparison
- Products they decided not to buy

Conversation:
${conversationSummary}

Return ONLY a JSON array of products in this exact format:
[
  {"name": "Product Name", "price": 24.99, "qty": 2},
  {"name": "Another Product", "price": 49.00, "qty": 1}
]

If no products were confirmed for order, return: []

JSON:`;

  try {
    const response = await completeWithContext(
      "You are a precise order extraction assistant. Extract only confirmed orders from conversations.",
      extractionPrompt
    );

    console.log("🤖 LLM extraction response:", response.substring(0, 500));

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("⚠️  No valid JSON found in LLM response");
      console.warn("Full response:", response);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log("📦 Parsed products:", parsed);
    
    // Validate and convert to OrderProduct format
    const products: OrderProduct[] = parsed
      .filter((p: any) => p.name && p.price && p.qty)
      .map((p: any) => ({
        product_id: '',
        name: String(p.name).trim(),
        price: parseFloat(p.price),
        qty: parseInt(p.qty),
      }));

    return products;
  } catch (error) {
    console.error("❌ Error extracting products with LLM:", error);
    return [];
  }
}

/**
 * Creates a customer record or finds existing one by phone
 */
export async function createOrGetCustomer(
  supabase: SupabaseClient,
  customerInfo: CustomerInfo,
  tenantId: string
): Promise<string | null> {
  // Try to find existing customer by phone
  if (customerInfo.phone) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", customerInfo.phone)
      .eq("tenant_id", tenantId)
      .single();
    
    if (existing) {
      console.log("✅ Found existing customer:", existing.id);
      return existing.id;
    }
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert({
      name: customerInfo.name || "Unknown",
      phone: customerInfo.phone || null,
      email: customerInfo.email || null,
      address: customerInfo.address || null,
      tenant_id: tenantId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("❌ Error creating customer:", error);
    return null;
  }

  console.log("✅ Created new customer:", newCustomer.id);
  return newCustomer.id;
}

/**
 * Looks up product ID by name (fuzzy matching)
 */
async function findProductByName(
  supabase: SupabaseClient,
  productName: string,
  tenantId: string
): Promise<string | null> {
  // Clean up the product name (remove size info, extra text)
  const cleanName = productName
    .replace(/\(Size [A-Z0-9]+\)/gi, '')
    .replace(/\(Size [A-Z0-9]+\) \(Size [A-Z0-9]+\)/gi, '')
    .trim();
  
  // Try exact match first
  const { data: exactMatch } = await supabase
    .from("products")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("name", cleanName)
    .limit(1)
    .single();
  
  if (exactMatch) {
    return exactMatch.id;
  }
  
  // Try partial match (contains the name)
  const { data: partialMatches } = await supabase
    .from("products")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${cleanName}%`)
    .limit(1);
  
  if (partialMatches && partialMatches.length > 0) {
    return partialMatches[0].id;
  }
  
  return null;
}

/**
 * Creates an order with items
 */
export async function createOrder(
  supabase: SupabaseClient,
  customerId: string,
  products: OrderProduct[],
  tenantId: string
): Promise<string | null> {
  if (products.length === 0) {
    console.warn("⚠️  No products to create order");
    return null;
  }

  // Look up product IDs for products that don't have them
  console.log("🔍 Looking up product IDs from database...");
  for (const product of products) {
    if (!product.product_id || product.product_id === '') {
      const foundId = await findProductByName(supabase, product.name, tenantId);
      if (foundId) {
        product.product_id = foundId;
        console.log(`✅ Found product ID for "${product.name}": ${foundId}`);
      } else {
        console.warn(`⚠️  Could not find product ID for "${product.name}"`);
      }
    }
  }
  
  // Filter out products that still don't have IDs
  const validProducts = products.filter(p => p.product_id && p.product_id !== '');
  
  if (validProducts.length === 0) {
    console.warn("⚠️  No valid products with IDs to create order");
    return null;
  }

  // Calculate total
  const total = validProducts.reduce((sum, p) => sum + (p.price * p.qty), 0);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      tenant_id: tenantId,
      total: total,
      status: "pending",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("❌ Error creating order:", orderError);
    return null;
  }

  const orderId = order.id;
  console.log("✅ Created order:", orderId, "Total:", total);

  // Create order items
  const orderItems = validProducts.map(p => ({
    order_id: orderId,
    product_id: p.product_id,
    tenant_id: tenantId,
    qty: p.qty,
    price: p.price,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("❌ Error creating order items:", itemsError);
    return null;
  }

  console.log("✅ Created", orderItems.length, "order items");
  return orderId;
}

/**
 * Processes a purchase: extracts info, creates customer and order
 */
export async function processPurchase(params: {
  supabase: SupabaseClient;
  purchaseMessage: string;
  conversationSummary: string;
  tenantId: string;
}): Promise<{ customerId: string | null; orderId: string | null }> {
  const { supabase, purchaseMessage, conversationSummary, tenantId } = params;

  console.log("📦 Processing purchase...");

  // Extract customer info from the purchase message
  const customerInfo = extractCustomerInfo(purchaseMessage);
  console.log("👤 Customer info:", customerInfo);

  if (!customerInfo.name && !customerInfo.phone) {
    console.warn("⚠️  No customer info found in message");
    return { customerId: null, orderId: null };
  }

  // Create or get customer
  const customerId = await createOrGetCustomer(supabase, customerInfo, tenantId);
  if (!customerId) {
    return { customerId: null, orderId: null };
  }

  // Extract products from conversation (using LLM)
  const products = await extractOrderProducts(conversationSummary);
  console.log("🛍️  Extracted products:", products);

  if (products.length === 0) {
    console.warn("⚠️  No products found in conversation");
    return { customerId, orderId: null };
  }

  // Create order
  const orderId = await createOrder(supabase, customerId, products, tenantId);

  return { customerId, orderId };
}

