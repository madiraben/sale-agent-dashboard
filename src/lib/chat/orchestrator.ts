import { findActivePageById, getTenantIdsForUser } from "@/lib/facebook/repository";
import { sendMessengerText, showTypingIndicator, markMessageAsSeen } from "@/lib/facebook/transport";
import { sendTelegramText } from "@/lib/telegram/transport";
import logger from "../logger";
import { 
  getSession, 
  saveSession, 
  BotSession, 
  addToConversationHistory 
} from "@/lib/sales/session";
import { logChatMessage } from "@/lib/sales/chat-logger";
import {
  handleDiscoveringStage,
  handleConfirmingProductsStage,
  handleConfirmingOrderStage,
  handleCollectingContactStage,
  StageResponse,
} from "@/lib/sales/stages";
import { getCustomerByMessengerId } from "@/lib/sales/order";

export async function handleMessengerText(pageId: string, senderId: string, text: string) {
  const page = await findActivePageById(pageId);
  if (!page || !page.page_token) return { ok: false, reason: "Page not found" } as const;
  
  const tenantIds = await getTenantIdsForUser(page.user_id);
  logger.info(`🏢 Messenger user ${page.user_id} has tenantIds: [${tenantIds.join(", ")}]`);
  if (tenantIds.length === 0) return { ok: false, reason: "No tenants found" } as const;

  try {
    // Mark message as seen and show typing indicator immediately
    await Promise.all([
      markMessageAsSeen(page.page_token, senderId),
      showTypingIndicator(page.page_token, senderId)
    ]);

    // Log incoming user message
    await logChatMessage({
      owner_user_id: page.user_id,
      channel: "messenger",
      external_user_id: senderId,
      sender: "user",
      message: text,
    });
    // logger.info(`[INFO] Loading or creating session for Messenger user: ${senderId}`);
    // Load or create session
    let session: BotSession = await getSession(page.user_id, "messenger", senderId);
    logger.info(`[INFO] Session loaded: ${session}`);
    // Check for returning customer and pre-populate contact info
    if (!session.contact?.name) {
      const existingCustomer = await getCustomerByMessengerId(tenantIds, senderId);
      logger.info(`[INFO] Existing customer found: ${existingCustomer}`);
      if (existingCustomer) {
        session.contact = {
          name: existingCustomer.name,
          email: existingCustomer.email || undefined,
          phone: existingCustomer.phone || undefined,
        };
        logger.info(`Found returning customer: ${existingCustomer.name}`, { customerId: existingCustomer.id });
      }
    }
    logger.info(`Session stage: ${session.stage}`);
    logger.info(`Messenger session stage: ${session.stage}`, { 
      cartItems: session.cart?.length || 0,
      hasContact: !!session.contact?.name,
      isReturning: !!session.contact?.name 
    });

    // Add user message to conversation history
    const conversationHistory = addToConversationHistory(
      session.conversation_history,
      "user",
      text
    );

    // Route to appropriate stage handler
    let stageResponse: StageResponse;
    
    switch (session.stage) {
      case "discovering":
        stageResponse = await handleDiscoveringStage(tenantIds, session, text);
        break;
        
      case "confirming_products":
        stageResponse = await handleConfirmingProductsStage(tenantIds, session, text);
        break;
        
      case "confirming_order":
        stageResponse = await handleConfirmingOrderStage(tenantIds, session, text);
        break;
        
      case "collecting_contact":
        stageResponse = await handleCollectingContactStage(tenantIds, session, text);
        break;
        
      default:
        // Fallback to discovering
        logger.warn(`Unknown stage: ${session.stage}, defaulting to discovering`);
        stageResponse = await handleDiscoveringStage(tenantIds, session, text);
    }

    // Add bot response to conversation history
    const updatedConversationHistory = addToConversationHistory(
      conversationHistory,
      "assistant",
      stageResponse.reply
    );

    // Update session with new state
    const updatedSession: BotSession = {
      ...session,
      stage: stageResponse.newStage,
      cart: stageResponse.updatedCart !== undefined ? stageResponse.updatedCart : session.cart,
      pending_products: stageResponse.updatedPendingProducts !== undefined 
        ? stageResponse.updatedPendingProducts 
        : session.pending_products,
      contact: stageResponse.updatedContact !== undefined 
        ? stageResponse.updatedContact 
        : session.contact,
      conversation_history: updatedConversationHistory,
    };

    // Save session
    await saveSession(updatedSession);
    
    logger.info(`Messenger session updated:`, { 
      newStage: updatedSession.stage,
      cartItems: updatedSession.cart?.length || 0,
      historyLength: updatedConversationHistory.length 
    });

    // Send reply to user
    await sendMessengerText(page.page_token, senderId, stageResponse.reply);

    // Log bot response
    await logChatMessage({
      owner_user_id: page.user_id,
      channel: "messenger",
      external_user_id: senderId,
      sender: "bot",
      message: stageResponse.reply,
    });

    logger.info("Messenger conversation handled successfully");
    return { ok: true } as const;
    
  } catch (error) {
    logger.error("Error handling messenger conversation:", error as Error);
    
    // Send friendly error message
    try {
      await sendMessengerText(
        page.page_token,
        senderId,
        "Sorry, I encountered an error processing your request. Please try again or contact support."
      );
    } catch (sendError) {
      logger.error("Failed to send error message:", sendError as Error);
    }
    
    return { ok: false, reason: "Error handling conversation" } as const;
  }
}

export async function handleTelegramText(
  userId: string,
  botToken: string,
  chatId: string | number,
  text: string
) {
  const tenantIds = await getTenantIdsForUser(userId);
  logger.info(`🏢 Telegram user ${userId} has tenantIds: [${tenantIds.join(", ")}]`);
  if (tenantIds.length === 0) return { ok: false, reason: "No tenants found" } as const;

  try {
    // Log incoming user message
    await logChatMessage({
      owner_user_id: userId,
      channel: "telegram",
      external_user_id: String(chatId),
      sender: "user",
      message: text,
    });

    // Load or create session
    let session: BotSession = await getSession(userId, "telegram", String(chatId));
    
    // Check for returning customer and pre-populate contact info
    if (!session.contact?.name) {
      const existingCustomer = await getCustomerByMessengerId(tenantIds, String(chatId));
      if (existingCustomer) {
        session.contact = {
          name: existingCustomer.name,
          email: existingCustomer.email || undefined,
          phone: existingCustomer.phone || undefined,
        };
        logger.info(`Found returning Telegram customer: ${existingCustomer.name}`, { customerId: existingCustomer.id });
      }
    }
    
    logger.info(`Telegram session stage: ${session.stage}`, { 
      cartItems: session.cart?.length || 0,
      hasContact: !!session.contact?.name,
      isReturning: !!session.contact?.name 
    });

    // Add user message to conversation history
    const conversationHistory = addToConversationHistory(
      session.conversation_history,
      "user",
      text
    );

    // Route to appropriate stage handler
    let stageResponse: StageResponse;
    
    switch (session.stage) {
      case "discovering":
        logger.info("handleDiscoveringStage", { text });
        stageResponse = await handleDiscoveringStage(tenantIds, session, text);
        break;
        
      case "confirming_products":
        logger.info("handleConfirmingProductsStage", { text });
        stageResponse = await handleConfirmingProductsStage(tenantIds, session, text);
        break;
        
      case "confirming_order":
        logger.info("handleConfirmingOrderStage", { text });
        stageResponse = await handleConfirmingOrderStage(tenantIds, session, text);
        break;
        
      case "collecting_contact":
        logger.info("handleCollectingContactStage", { text });
        stageResponse = await handleCollectingContactStage(tenantIds, session, text);
        break;
        
      default:
        // Fallback to discovering
        logger.warn(`Unknown stage: ${session.stage}, defaulting to discovering`);
        stageResponse = await handleDiscoveringStage(tenantIds, session, text);
    }

    // Add bot response to conversation history
    const updatedConversationHistory = addToConversationHistory(
      conversationHistory,
      "assistant",
      stageResponse.reply
    );

    // Update session with new state
    const updatedSession: BotSession = {
      ...session,
      stage: stageResponse.newStage,
      cart: stageResponse.updatedCart !== undefined ? stageResponse.updatedCart : session.cart,
      pending_products: stageResponse.updatedPendingProducts !== undefined 
        ? stageResponse.updatedPendingProducts 
        : session.pending_products,
      contact: stageResponse.updatedContact !== undefined 
        ? stageResponse.updatedContact 
        : session.contact,
      conversation_history: updatedConversationHistory,
    };

    // Save session
    await saveSession(updatedSession);
    
    logger.info(`Telegram session updated:`, { 
      newStage: updatedSession.stage,
      cartItems: updatedSession.cart?.length || 0,
      historyLength: updatedConversationHistory.length 
    });

    // Send reply to user
    await sendTelegramText(botToken, chatId, stageResponse.reply);

    // Log bot response
    await logChatMessage({
      owner_user_id: userId,
      channel: "telegram",
      external_user_id: String(chatId),
      sender: "bot",
      message: stageResponse.reply,
    });

    logger.info("Telegram conversation handled successfully");
    return { ok: true } as const;
    
  } catch (error) {
    logger.error("Error handling telegram conversation:", error as Error);
    
    // Send friendly error message
    try {
      await sendTelegramText(
        botToken,
        chatId,
        "Sorry, I encountered an error processing your request. Please try again or contact support."
      );
    } catch (sendError) {
      logger.error("Failed to send error message:", sendError as Error);
    }
    
    return { ok: false, reason: "Error handling conversation" } as const;
  }
}
