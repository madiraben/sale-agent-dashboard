

import { BotSession, clearCart, getRecentConversation } from "../session";
import { createPendingOrder } from "../order";
import { getCartProducts } from "../product-search";
import { isObviouslyOffTopic, getOffTopicResponse, validateProductTopic } from "../topic-validator";
import { generateAIResponse } from "../ai-responder";
import { getUnifiedAIResponse } from "../unified-ai";
import logger from "../../logger";
import { StageResponse } from "./types";

/**
 * Initialize stage context (common to all stages)
 */
export function initializeStageContext(session: BotSession) {
  return {
    conversationContext: getRecentConversation(session.conversation_history),
    useUnifiedAI: true, // Feature flag
  };
}

/**
 * Check if user message is off-topic
 * Returns StageResponse if off-topic, null otherwise
 */
export async function handleOffTopicCheck(
  userText: string,
  stage: BotSession["stage"],
  conversationContext: Array<{ role: "user" | "assistant"; content: string }>,
  additionalContext?: {
    cartSummary?: string;
    productResults?: string;
    contactInfo?: any;
  }
): Promise<StageResponse | null> {
  // Fast pattern-based check
  if (isObviouslyOffTopic(userText)) {
    logger.info(`Obviously off-topic query detected in ${stage} stage (pattern match)`);
    const reply = getOffTopicResponse(1.0, userText);
    return { reply, newStage: stage };
  }

  // More thorough AI-based check (only if not obviously on-topic)
  const topicValidation = await validateProductTopic(userText);
  
  if (!topicValidation.isOnTopic && topicValidation.confidence > 0.6) {
    logger.info(`Off-topic query detected in ${stage} stage`, {
      confidence: topicValidation.confidence,
      reason: topicValidation.reason,
    });

    // Generate contextual response based on stage
    const systemContext = getOffTopicSystemContext(stage);
    
    const reply = await generateAIResponse({
      stage,
      userMessage: userText,
      conversationHistory: conversationContext,
      ...additionalContext,
      systemContext,
    });

    return { reply, newStage: stage };
  }

  return null; // Not off-topic, continue normal processing
}

/**
 * Get system context for off-topic responses by stage
 */
function getOffTopicSystemContext(stage: BotSession["stage"]): string {
  switch (stage) {
    case "discovering":
      return "Customer asked off-topic question. Politely redirect them to browse products or ask about orders.";
    
    case "confirming_products":
      return "Customer asked off-topic question. Politely redirect them to select a product from the options.";
    
    case "confirming_order":
      return "Customer asked off-topic question. Politely redirect to order confirmation. Ask if they're ready to confirm (yes/no).";
    
    case "collecting_contact":
      return "Customer asked off-topic question during checkout. Politely redirect them to complete their order by providing contact info.";
    
    default:
      return "Customer asked off-topic question. Politely redirect to the current task.";
  }
}

/**
 * Handle cancel intent (common to all stages)
 */
export async function handleCancelIntent(
  userText: string,
  conversationContext: Array<{ role: "user" | "assistant"; content: string }>
): Promise<StageResponse> {
  const reply = await generateAIResponse({
    stage: "discovering",
    userMessage: userText,
    conversationHistory: conversationContext,
    systemContext: "Customer cancelled their order. Cart has been cleared. Ask how you can help them now.",
  });

  return {
    reply,
    newStage: "discovering",
    updatedCart: clearCart(),
    updatedPendingProducts: undefined,
    updatedContact: {},
  };
}

/**
 * Common confirmation patterns (yes/no/cancel)
 */
export const CONFIRMATION_PATTERNS = {
  YES: /^(yes|yeah|yep|sure|ok|okay|correct|confirm|that'?s? right|looks good|proceed|បាទ|ចាស)$/i,
  NO: /^(no|nope|nah|wrong|incorrect|change|update|ទេ)$/i,
  CANCEL: /^(cancel|stop|quit|exit|forget it|never mind|លុបចោល)$/i,
};

/**
 * Check if text matches a confirmation pattern
 */
export function matchesPattern(text: string, pattern: RegExp): boolean {
  return pattern.test(text.toLowerCase().trim());
}

/**
 * Create order with standardized success/error handling
 * 
 * This eliminates the redundant order creation pattern repeated 7 times
 */
export async function createOrderWithHandling(params: {
  tenantIds: string[];
  contact: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  cart: BotSession["cart"];
  messengerSenderId: string;
  userText: string;
  conversationContext: Array<{ role: "user" | "assistant"; content: string }>;
  includeOrderDetails?: boolean;
}): Promise<StageResponse> {
  const {
    tenantIds,
    contact,
    cart,
    messengerSenderId,
    userText,
    conversationContext,
    includeOrderDetails = false,
  } = params;

  try {
    // Create the order
    const orderResult = await createPendingOrder({
      tenantIds,
      contact,
      cart,
      messengerSenderId,
    });

    logger.info("Order created successfully:", orderResult?.orderId);

    // Build success message
    let systemContext = `Order #${orderResult?.orderId} created successfully! Total: $${orderResult?.total.toFixed(2)}, ${orderResult?.itemCount} items.`;

    // Add detailed order information if requested
    if (includeOrderDetails) {
      const cartProducts = await getCartProducts(tenantIds, cart);
      const itemsList = cartProducts
        .map((item) => `• ${item.qty}x ${item.product.name} - $${(item.product.price * item.qty).toFixed(2)}`)
        .join("\n");

      systemContext += `\n\nOrder Details:\n${itemsList}\n\nDelivery to: ${contact.address}\nContact: ${contact.email || contact.phone}`;
    }

    systemContext += `\n\nThank ${contact.name} warmly! Tell them we'll contact them within 24 hours at ${contact.phone || contact.email} for confirmation and delivery details.`;

    // Generate AI response
    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext,
    });

    return {
      reply,
      newStage: "discovering",
      orderId: orderResult?.orderId,
      updatedCart: clearCart(),
      updatedContact: {},
    };
  } catch (error: any) {
    logger.error("Order creation failed:", error);

    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: `Failed to create order: ${error.message}. Apologize sincerely and ask them to try again or contact support.`,
    });

    return {
      reply,
      newStage: "discovering",
      updatedCart: clearCart(),
      updatedContact: {},
    };
  }
}

/**
 * Create order using unified AI (alternative version)
 */
export async function createOrderWithUnifiedAI(params: {
  tenantIds: string[];
  contact: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  cart: BotSession["cart"];
  messengerSenderId: string;
  userText: string;
  conversationContext: Array<{ role: "user" | "assistant"; content: string }>;
  includeOrderDetails?: boolean;
}): Promise<StageResponse> {
  const {
    tenantIds,
    contact,
    cart,
    messengerSenderId,
    userText,
    conversationContext,
    includeOrderDetails = false,
  } = params;

  try {
    const orderResult = await createPendingOrder({
      tenantIds,
      contact,
      cart,
      messengerSenderId,
    });

    logger.info("Order created successfully:", orderResult?.orderId);

    let systemContext = `✅ Order #${orderResult?.orderId} created successfully!\n\nTotal: $${orderResult?.total.toFixed(2)}\nItems: ${orderResult?.itemCount}`;

    if (includeOrderDetails) {
      const cartProducts = await getCartProducts(tenantIds, cart);
      const itemsList = cartProducts
        .map((item) => `• ${item.qty}x ${item.product.name} - $${(item.product.price * item.qty).toFixed(2)}`)
        .join("\n");

      systemContext += `\n\nOrder Details:\n${itemsList}\n\nDelivery to: ${contact.address}\nContact: ${contact.email || contact.phone}`;
    }

    systemContext += `\n\nThank ${contact.name} warmly! Tell them we'll contact them within 24 hours for confirmation.`;

    const unifiedResult = await getUnifiedAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext,
    });

    return {
      reply: unifiedResult.reply,
      newStage: "discovering",
      orderId: orderResult?.orderId,
      updatedCart: clearCart(),
      updatedContact: {},
    };
  } catch (error: any) {
    logger.error("Order creation failed:", error);

    const unifiedResult = await getUnifiedAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: `Failed to create order: ${error.message}. Apologize sincerely and ask them to try again.`,
    });

    return {
      reply: unifiedResult.reply,
      newStage: "discovering",
      updatedCart: clearCart(),
      updatedContact: {},
    };
  }
}

/**
 * Check if contact information is complete
 */
export function hasCompleteContactInfo(contact?: {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}): boolean {
  return !!(
    contact?.name &&
    (contact?.phone || contact?.email) &&
    contact?.address
  );
}

/**
 * Normalize contact data
 */
export function normalizeContact(contact: {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}): {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
} {
  return {
    name: contact.name || "",
    email: contact.email || null,
    phone: contact.phone || null,
    address: contact.address || null,
  };
}

