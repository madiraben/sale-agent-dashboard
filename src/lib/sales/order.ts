import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CartItem } from "./session";
import logger from "../logger";

export type OrderRequest = {
  tenantIds: string[];
  contact: { name: string; email?: string | null; phone?: string | null; address?: string | null };
  cart: CartItem[];
  messengerSenderId?: string | null; // Optional Messenger sender ID for customer linking
};

export type OrderResult = {
  orderId: string;
  customerId: string;
  total: number;
  itemCount: number;
};

/**
 * Find existing customer or create new one
 * Priority: Messenger ID > Email > Phone
 */
async function findOrCreateCustomer(
  tenantIds: string[],
  name: string,
  email?: string | null,
  phone?: string | null,
  address?: string | null,
  messengerSenderId?: string | null
): Promise<string> {
  const admin = createSupabaseAdminClient();

  // 1. Try to find by Messenger sender ID first (most reliable for returning customers)
  if (messengerSenderId) {
    const { data } = await admin
      .from("customers")
      .select("id")
      .in("tenant_id", tenantIds)
      .eq("messenger_sender_id", messengerSenderId)
      .maybeSingle();

    if (data?.id) {
      // Update customer info (they might have provided new/updated contact info)
      await admin
        .from("customers")
        .update({ 
          name, 
          email: email || null, 
          phone: phone || null,
          address: address || null,
          updated_at: new Date().toISOString() 
        })
        .eq("id", data.id);
      
      logger.info(`Found existing customer by Messenger ID: ${data.id}`);
      return data.id as string;
    }
  }

  // Validate: Must have at least one contact method
  if (!email && !phone) {
    throw new Error("Customer must have at least one contact method (email or phone)");
  }

  // 2. Try to find existing customer by email
  if (email) {
    const { data } = await admin
      .from("customers")
      .select("id")
      .in("tenant_id", tenantIds)
      .eq("email", email)
      .maybeSingle();

    if (data?.id) {
      // Link Messenger ID to existing customer
      const updateData: any = { phone, name, address: address || null, updated_at: new Date().toISOString() };
      if (messengerSenderId) {
        updateData.messenger_sender_id = messengerSenderId;
      }
      
      await admin
        .from("customers")
        .update(updateData)
        .eq("id", data.id);
      
      logger.info(`Linked Messenger ID to existing customer (by email): ${data.id}`);
      return data.id as string;
    }
  }

  // 3. Try to find by phone
  if (phone) {
    const { data } = await admin
      .from("customers")
      .select("id")
      .in("tenant_id", tenantIds)
      .eq("phone", phone)
      .maybeSingle();

    if (data?.id) {
      // Link Messenger ID to existing customer
      const updateData: any = { email, name, address: address || null, updated_at: new Date().toISOString() };
      if (messengerSenderId) {
        updateData.messenger_sender_id = messengerSenderId;
      }
      
      await admin
        .from("customers")
        .update(updateData)
        .eq("id", data.id);
      
      logger.info(`Linked Messenger ID to existing customer (by phone): ${data.id}`);
      return data.id as string;
    }
  }

  // 4. Create new customer (use first tenant_id)
  const tenantId = tenantIds[0];
  const { data: inserted, error } = await admin
    .from("customers")
    .insert({
      tenant_id: tenantId,
      name: name.trim() || "Guest",
      email: email || null,
      phone: phone || null,
      address: address || null,
      messenger_sender_id: messengerSenderId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating customer:", error);
    
    // Provide more specific error messages
    if (error.code === '23502') {
      throw new Error("Missing required customer information. Please provide at least a phone number or email address.");
    }
    if (error.code === '23505') {
      throw new Error("Customer with this contact information already exists.");
    }
    
    throw new Error(`Failed to create customer: ${error.message || 'Unknown error'}`);
  }

  logger.info(`Created new customer with Messenger ID: ${(inserted as any).id}`);
  return (inserted as any).id as string;
}

/**
 * Get customer info by Messenger sender ID
 * Returns customer contact info if found, null otherwise
 */
export async function getCustomerByMessengerId(
  tenantIds: string[],
  messengerSenderId: string
): Promise<{ id: string; name: string; email: string | null; phone: string | null; address: string | null } | null> {
  const admin = createSupabaseAdminClient();

  const { data } = await admin
    .from("customers")
    .select("id, name, email, phone, address")
    .in("tenant_id", tenantIds)
    .eq("messenger_sender_id", messengerSenderId)
    .maybeSingle();

  return data || null;
}

/**
 * Validate cart items against inventory
 */
async function validateCartInventory(
  tenantIds: string[],
  cart: CartItem[]
): Promise<{ valid: boolean; issues: string[] }> {
  const admin = createSupabaseAdminClient();
  const issues: string[] = [];

  for (const item of cart) {
    const { data } = await admin
      .from("products")
      .select("id, name, stock, price")
      .in("tenant_id", tenantIds)
      .eq("id", item.product_id)
      .maybeSingle();

    if (!data) {
      issues.push(`Product "${item.name}" not found`);
      continue;
    }

    const product = data as any;
    if (product.stock < item.qty) {
      issues.push(`Only ${product.stock} of "${item.name}" available (requested ${item.qty})`);
    }

    // Verify price hasn't changed
    if (Math.abs(product.price - item.price) > 0.01) {
      issues.push(`Price of "${item.name}" has changed to $${product.price.toFixed(2)}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Create a pending order from cart
 */
export async function createPendingOrder(req: OrderRequest): Promise<OrderResult | null> {
  const admin = createSupabaseAdminClient();

  // Validate cart
  if (!req.cart || req.cart.length === 0) {
    throw new Error("Cart is empty");
  }

  // Validate inventory
  const validation = await validateCartInventory(req.tenantIds, req.cart);
  if (!validation.valid) {
    throw new Error(`Order validation failed: ${validation.issues.join(", ")}`);
  }

  // Calculate total
  const total = req.cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Find or create customer
  const customerId = await findOrCreateCustomer(
    req.tenantIds,
    req.contact.name,
    req.contact.email,
    req.contact.phone,
    req.contact.address,
    req.messengerSenderId
  );

  // Use first tenant_id
  const tenantId = req.tenantIds[0];

  // Create order
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      customer_id: customerId,
      tenant_id: tenantId,
      status: "pending",
      total,
      delivery_address: req.contact.address || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (orderError) {
    console.error("Error creating order:", orderError);
    throw new Error("Failed to create order");
  }

  const orderId = (order as any).id as string;

  // Create order items
  const orderItems = req.cart.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    tenant_id: tenantId,
    qty: item.qty,
    price: item.price,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error: itemsError } = await admin
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
    // Try to delete the order if items failed
    await admin.from("orders").delete().eq("id", orderId);
    throw new Error("Failed to create order items");
  }

  // Update product stock
  for (const item of req.cart) {
    try {
      await admin.rpc("decrement_product_stock", {
        product_id: item.product_id,
        qty: item.qty,
      });
    } catch (err) {
      logger.error("Failed to update stock:", err);
      // Don't fail the order, but log it
    }
  }

  logger.info(`[INFO] Order created successfully: { orderId: ${orderId}, customerId: ${customerId}, total: ${total}, items: ${req.cart.length} }`);

  return {
    orderId,
    customerId,
    total,
    itemCount: req.cart.length,
  };
}

/**
 * Get order by ID
 */
export async function getOrderById(
  tenantIds: string[],
  orderId: string
): Promise<any | null> {
  const admin = createSupabaseAdminClient();
  
  const { data } = await admin
    .from("orders")
    .select(`
      id,
      status,
      total,
      created_at,
      customer:customers(id, name, email, phone),
      items:order_items(
        id,
        qty,
        price,
        product:products(id, name, description)
      )
    `)
    .eq("id", orderId)
    .maybeSingle();

  return data;
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  
  const { error } = await admin
    .from("orders")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return !error;
}
