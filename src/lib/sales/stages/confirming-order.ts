import { extractSalesIntent, SalesIntent, isContactComplete } from "../intent";
import { runRagForUserTenants } from "@/lib/rag/engine";
import { 
  BotSession, 
  clearCart, 
  isCartEmpty,
  getRecentConversation,
} from "../session";
import { createPendingOrder } from "../order";
import { 
  getCartProducts,
  formatCartDisplay,
} from "../product-search";
import { validateProductTopic, isObviouslyOffTopic, getOffTopicResponse } from "../topic-validator";
import { generateAIResponse } from "../ai-responder";
import { getUnifiedAIResponse } from "../unified-ai";
import logger from "../../logger";
import { StageResponse } from "./types";

// ============================================
// STAGE 3: CONFIRMING_ORDER
// User is confirming their final cart before checkout
// ============================================
export async function handleConfirmingOrderStage(
  tenantIds: string[],
  session: BotSession,
  userText: string
): Promise<StageResponse> {
  const conversationContext = getRecentConversation(session.conversation_history);
  
  // 🚀 OPTIMIZATION: Use unified AI call
  const useUnifiedAI = true;
  
  if (useUnifiedAI) {
    return await handleConfirmingOrderStageUnified(tenantIds, session, userText, conversationContext);
  }
  
  // Legacy approach
  const extracted: SalesIntent = await extractSalesIntent(userText, conversationContext, "confirming_order");
  
  const lowerText = userText.toLowerCase().trim();

  // Handle confirmation
  if (extracted.intent === "confirm_order" || 
      /^(yes|yeah|yep|sure|ok|okay|correct|confirm|that'?s? right|looks good|proceed)$/i.test(lowerText)) {
    
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
    if (isContactComplete(session.contact)) {
      // We have everything, create order
      try {
        const result = await createPendingOrder({
          tenantIds,
          contact: {
            name: session.contact.name!,
            email: session.contact.email || null,
            phone: session.contact.phone || null,
            address: session.contact.address || null,
          },
          cart: session.cart,
          messengerSenderId: session.external_user_id, // Link order to Messenger sender
        });

        const reply = await generateAIResponse({
          stage: "discovering",
          userMessage: userText,
          conversationHistory: conversationContext,
          systemContext: `Order #${result?.orderId} created successfully! Total: $${result?.total.toFixed(2)}, Items: ${result?.itemCount}. Thank customer ${session.contact.name} and let them know we'll contact them at ${session.contact.phone || session.contact.email}. Ask if they need anything else.`,
        });

        return {
          reply,
          newStage: "discovering",
          updatedCart: clearCart(),
          updatedContact: {},
        };
      } catch (error: any) {
        logger.error("Order creation failed:", error);
        
        const reply = await generateAIResponse({
          stage: "discovering",
          userMessage: userText,
          conversationHistory: conversationContext,
          systemContext: `Error creating order: ${error.message}. Apologize and ask them to try again or contact support.`,
        });

        return {
          reply,
          newStage: "discovering",
        };
      }
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
  if (extracted.intent === "cancel" || 
      /^(no|nope|cancel|stop|nevermind|never mind)$/i.test(lowerText)) {
    
    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: "Customer cancelled the order. Cart has been cleared. Ask if you can help with something else.",
    });

    return {
      reply,
      newStage: "discovering",
      updatedCart: clearCart(),
    };
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
    // Check if question is off-topic
    if (isObviouslyOffTopic(userText)) {
      const cartProducts = await getCartProducts(tenantIds, session.cart);
      const cartDisplay = formatCartDisplay(cartProducts);
      
      const reply = await generateAIResponse({
        stage: "confirming_order",
        userMessage: userText,
        conversationHistory: conversationContext,
        cartSummary: cartDisplay,
        systemContext: "Customer asked off-topic question. Politely redirect to order confirmation. Show cart and ask if they're ready to confirm (yes/no).",
      });

      return {
        reply,
        newStage: "confirming_order",
      };
    }

    const topicValidation = await validateProductTopic(userText);
    
    if (!topicValidation.isOnTopic && topicValidation.confidence > 0.6) {
      const cartProducts = await getCartProducts(tenantIds, session.cart);
      const cartDisplay = formatCartDisplay(cartProducts);
      
      const reply = await generateAIResponse({
        stage: "confirming_order",
        userMessage: userText,
        conversationHistory: conversationContext,
        cartSummary: cartDisplay,
        systemContext: "Customer asked off-topic question. Say you can only answer product questions. Show cart and ask if ready to confirm.",
      });

      return {
        reply,
        newStage: "confirming_order",
      };
    }

    // Answer the product question, then remind about order confirmation
    const ragReply = await runRagForUserTenants(tenantIds, userText);
    const cartProducts = await getCartProducts(tenantIds, session.cart);
    const cartDisplay = formatCartDisplay(cartProducts);
    
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
  const cartProducts = await getCartProducts(tenantIds, session.cart);
  const cartDisplay = formatCartDisplay(cartProducts);
  
  const reply = await generateAIResponse({
    stage: "confirming_order",
    userMessage: userText,
    conversationHistory: conversationContext,
    cartSummary: cartDisplay,
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
  if (result.intent === "confirm_order" || 
      /^(yes|yeah|yep|sure|ok|okay|correct|confirm|that'?s? right|looks good|proceed)$/i.test(lowerText)) {
    
    // Check if we already have complete contact info
    if (session.contact && isContactComplete(session.contact)) {
      try {
        const orderResult = await createPendingOrder({
          tenantIds,
          contact: {
            name: session.contact.name!,
            email: session.contact.email || null,
            phone: session.contact.phone || null,
            address: session.contact.address || null,
          },
          cart: session.cart,
          messengerSenderId: session.external_user_id,
        });
        
        return {
          reply: result.reply,
          newStage: "discovering",
          updatedCart: clearCart(),
          updatedContact: undefined,
          updatedPendingProducts: undefined,
          orderId: orderResult?.orderId,
        };
      } catch (error) {
        logger.error("Failed to create order:", error);
        return {
          reply: result.reply,
          newStage: "confirming_order",
        };
      }
    }

    // Need to collect contact information
    return {
      reply: result.reply,
      newStage: "collecting_contact",
    };
  }

  // Handle cancellation
  if (result.intent === "cancel" || 
      /^(no|nope|cancel|nevermind|never mind)$/i.test(lowerText)) {
    return {
      reply: result.reply,
      newStage: "discovering",
      updatedCart: clearCart(),
    };
  }

  // Handle off-topic or query
  if (result.intent === "query") {
    if (isObviouslyOffTopic(userText)) {
      const reply = getOffTopicResponse(1.0, userText);
      return { reply, newStage: "confirming_order" };
    }
  }

  // Default: stay in stage and show cart again
  return {
    reply: result.reply,
    newStage: "confirming_order",
  };
}


