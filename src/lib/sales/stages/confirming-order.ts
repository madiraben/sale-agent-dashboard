import { extractSalesIntent, SalesIntent } from "../intent";
import { runRagForUserTenants } from "@/lib/rag/engine";
import { 
  BotSession, 
  isCartEmpty,
} from "../session";
import { 
  getCartProducts,
  formatCartDisplay,
} from "../product-search";
import { generateAIResponse } from "../ai-responder";
import { getUnifiedAIResponse } from "../unified-ai";
import logger from "../../logger";
import { StageResponse } from "./types";
import {
  initializeStageContext,
  handleOffTopicCheck,
  handleCancelIntent,
  CONFIRMATION_PATTERNS,
  matchesPattern,
  createOrderWithHandling,
  createOrderWithUnifiedAI,
  hasCompleteContactInfo,
  normalizeContact,
} from "./common-handlers";

// ============================================
// STAGE 3: CONFIRMING_ORDER
// User is confirming their final cart before checkout
// ============================================
export async function handleConfirmingOrderStage(
  tenantIds: string[],
  session: BotSession,
  userText: string
): Promise<StageResponse> {
  const { conversationContext, useUnifiedAI } = initializeStageContext(session);
  
  if (useUnifiedAI) {
    return await handleConfirmingOrderStageUnified(tenantIds, session, userText, conversationContext);
  }
  
  // Legacy approach
  const extracted: SalesIntent = await extractSalesIntent(userText, conversationContext, "confirming_order");
  
  // Handle confirmation
  if (extracted.intent === "confirm_order" || matchesPattern(userText, CONFIRMATION_PATTERNS.YES)) {
    
    if (isCartEmpty(session.cart)) {
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        systemContext: "Cart is empty but customer tried to confirm order. Let them know they need to add products first.",
      });

      return {
        reply,
        newStage: "discovering",
      };
    }

    // Check if we have contact info
    if (hasCompleteContactInfo(session.contact)) {
      // We have everything, create order using common handler
      return await createOrderWithHandling({
        tenantIds,
        contact: normalizeContact(session.contact!),
        cart: session.cart,
        messengerSenderId: session.external_user_id,
        userText,
        conversationContext,
        includeOrderDetails: false,
      });
    }

    // Need contact info
    const reply = await generateAIResponse({
      stage: "collecting_contact",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: "Customer confirmed order. Now need to collect contact information. Ask for their name first.",
    });

    return {
      reply,
      newStage: "collecting_contact",
    };
  }

  // Handle cancellation
  if (extracted.intent === "cancel" || matchesPattern(userText, CONFIRMATION_PATTERNS.CANCEL)) {
    return await handleCancelIntent(userText, conversationContext);
  }

  // Handle modifications
  if (extracted.intent === "modify_cart") {
    const cartProducts = await getCartProducts(tenantIds, session.cart);
    const cartDisplay = formatCartDisplay(cartProducts);
    
    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      cartSummary: cartDisplay,
      systemContext: "Customer wants to modify their cart. Show current cart and explain they can add more items, remove items, or change quantities.",
    });
    
    return {
      reply,
      newStage: "discovering",
    };
  }

  // User asking questions during confirmation
  if (extracted.intent === "query") {
    // Check if question is off-topic using common handler
    let cartProducts = await getCartProducts(tenantIds, session.cart);
    let cartDisplay = formatCartDisplay(cartProducts);
    
    const offTopicResult = await handleOffTopicCheck(
      userText,
      "confirming_order",
      conversationContext,
      { cartSummary: cartDisplay }
    );
    if (offTopicResult) {
      return offTopicResult;
    }

    // Answer the product question, then remind about order confirmation
    const ragReply = await runRagForUserTenants(tenantIds, userText, conversationContext.join('\n'));
    // Reuse the already fetched cart info
    
    const reply = await generateAIResponse({
      stage: "confirming_order",
      userMessage: userText,
      conversationHistory: conversationContext,
      cartSummary: cartDisplay,
      systemContext: `Answer from RAG: ${ragReply}. After providing this answer, show their cart and ask if they're ready to confirm their order (yes/no).`,
    });
    
    return {
      reply,
      newStage: "confirming_order",
    };
  }

  // Fallback - show cart and ask for confirmation
  const fallbackCartProducts = await getCartProducts(tenantIds, session.cart);
  const fallbackCartDisplay = formatCartDisplay(fallbackCartProducts);
  
  const reply = await generateAIResponse({
    stage: "confirming_order",
    userMessage: userText,
    conversationHistory: conversationContext,
    cartSummary: fallbackCartDisplay,
    systemContext: "Show customer their order and ask them to confirm (yes to proceed, no to cancel).",
  });
  
  return {
    reply,
    newStage: "confirming_order",
  };
}

// ============================================
// UNIFIED VERSION - 50% faster
// ============================================
async function handleConfirmingOrderStageUnified(
  tenantIds: string[],
  session: BotSession,
  userText: string,
  conversationContext: Array<{ role: "user" | "assistant"; content: string }>
): Promise<StageResponse> {
  logger.info("🚀 Using unified AI approach for confirming_order stage");

  const lowerText = userText.toLowerCase().trim();

  // Check for cart
  if (isCartEmpty(session.cart)) {
    const result = await getUnifiedAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: "Cart is empty. Ask what they'd like to order.",
    });
    return { reply: result.reply, newStage: "discovering" };
  }

  // Get cart display
  const cartProducts = await getCartProducts(tenantIds, session.cart);
  const cartDisplay = formatCartDisplay(cartProducts);

  // Make unified AI call
  const result = await getUnifiedAIResponse({
    stage: "confirming_order",
    userMessage: userText,
    conversationHistory: conversationContext,
    cartSummary: cartDisplay,
  });

  logger.info("Unified result:", { intent: result.intent, confidence: result.confidence });

  // Handle confirmation
  if (result.intent === "confirm_order" || matchesPattern(userText, CONFIRMATION_PATTERNS.YES)) {
    
    // Check if we already have complete contact info
    if (hasCompleteContactInfo(session.contact)) {
      // Use common handler for unified AI order creation
      return await createOrderWithUnifiedAI({
        tenantIds,
        contact: normalizeContact(session.contact!),
        cart: session.cart,
        messengerSenderId: session.external_user_id,
        userText,
        conversationContext,
        includeOrderDetails: false,
      });
    }

    // Need to collect contact information
    return {
      reply: result.reply,
      newStage: "collecting_contact",
    };
  }

  // Handle cancellation
  if (result.intent === "cancel" || matchesPattern(userText, CONFIRMATION_PATTERNS.CANCEL)) {
    return await handleCancelIntent(userText, conversationContext);
  }

  // Handle off-topic or query
  if (result.intent === "query") {
    const offTopicResult = await handleOffTopicCheck(userText, "confirming_order", conversationContext);
    if (offTopicResult) {
      return offTopicResult;
    }
  }

  // Default: stay in stage and show cart again
  return {
    reply: result.reply,
    newStage: "confirming_order",
  };
}


