import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CartItem = {
  product_id: string;
  name: string;
  qty: number;
  price: number;
};

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

export type BotSession = {
  owner_user_id: string;
  channel: "messenger" | "telegram";
  external_user_id: string;
  stage: "discovering" | "confirming_products" | "confirming_order" | "collecting_contact";
  cart: CartItem[];
  pending_products?: Array<{ query: string; results: any[] }>; // Products awaiting user selection
  contact: { name?: string; email?: string; phone?: string; address?: string };
  conversation_history?: ConversationMessage[];
  metadata?: {
    last_intent?: string;
    failed_attempts?: number;
    session_start?: string;
  };
};

export async function getSession(
  ownerUserId: string,
  channel: "messenger" | "telegram",
  externalUserId: string
): Promise<BotSession> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("bot_sessions")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("channel", channel)
    .eq("external_user_id", externalUserId)
    .maybeSingle();

  if (data) {
    // Parse JSON fields
    return {
      owner_user_id: data.owner_user_id,
      channel: data.channel,
      external_user_id: data.external_user_id,
      stage: data.stage || "discovering",
      cart: Array.isArray(data.cart) ? data.cart : [],
      pending_products: data.pending_products || undefined,
      contact: data.contact || {},
      conversation_history: Array.isArray(data.conversation_history) 
        ? data.conversation_history 
        : [],
      metadata: data.metadata || {},
    };
  }

  // Return new session
  return {
    owner_user_id: ownerUserId,
    channel,
    external_user_id: externalUserId,
    stage: "discovering",
    cart: [],
    contact: {},
    conversation_history: [],
    metadata: {
      session_start: new Date().toISOString(),
      failed_attempts: 0,
    },
  };
}

export async function saveSession(session: BotSession): Promise<void> {
  const admin = createSupabaseAdminClient();
  
  // Limit conversation history to last 20 messages to prevent bloat
  const conversationHistory = session.conversation_history || [];
  const limitedHistory = conversationHistory.slice(-20);
  
  await admin
    .from("bot_sessions")
    .upsert(
      {
        owner_user_id: session.owner_user_id,
        channel: session.channel,
        external_user_id: session.external_user_id,
        stage: session.stage,
        cart: session.cart,
        pending_products: session.pending_products || null,
        contact: session.contact,
        conversation_history: limitedHistory,
        metadata: session.metadata || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_user_id,channel,external_user_id" }
    );
}

export async function resetSession(
  ownerUserId: string,
  channel: "messenger" | "telegram",
  externalUserId: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("bot_sessions")
    .upsert(
      {
        owner_user_id: ownerUserId,
        channel,
        external_user_id: externalUserId,
        stage: "discovering",
        cart: [],
        pending_products: null,
        contact: {},
        conversation_history: [],
        metadata: {
          session_start: new Date().toISOString(),
          failed_attempts: 0,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_user_id,channel,external_user_id" }
    );
}

/**
 * Add item to cart
 */
export function addToCart(cart: CartItem[], item: CartItem): CartItem[] {
  const existing = cart.find(i => i.product_id === item.product_id);
  
  if (existing) {
    // Update quantity
    return cart.map(i => 
      i.product_id === item.product_id 
        ? { ...i, qty: i.qty + item.qty }
        : i
    );
  }
  
  // Add new item
  return [...cart, item];
}

/**
 * Update cart item quantity
 */
export function updateCartItemQty(
  cart: CartItem[],
  productId: string,
  newQty: number
): CartItem[] {
  if (newQty <= 0) {
    return removeFromCart(cart, productId);
  }
  
  return cart.map(i => 
    i.product_id === productId 
      ? { ...i, qty: newQty }
      : i
  );
}

/**
 * Remove item from cart
 */
export function removeFromCart(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter(i => i.product_id !== productId);
}

/**
 * Clear cart
 */
export function clearCart(): CartItem[] {
  return [];
}

/**
 * Calculate cart total
 */
export function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

/**
 * Check if cart is empty
 */
export function isCartEmpty(cart: CartItem[]): boolean {
  return !cart || cart.length === 0;
}

/**
 * Add message to conversation history
 */
export function addToConversationHistory(
  history: ConversationMessage[] | undefined,
  role: "user" | "assistant",
  content: string
): ConversationMessage[] {
  const currentHistory = history || [];
  return [
    ...currentHistory,
    {
      role,
      content,
      timestamp: new Date().toISOString(),
    },
  ];
}

/**
 * Get recent conversation context for LLM
 */
export function getRecentConversation(
  history: ConversationMessage[] | undefined,
  limit: number = 10
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!history || history.length === 0) return [];
  
  return history
    .slice(-limit)
    .map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
}
