import { extractSalesIntent, SalesIntent, isValidEmail, isValidPhone } from "../intent";
import { 
  BotSession, 
  clearCart, 
  getRecentConversation,
} from "../session";
import { createPendingOrder } from "../order";
import { validateProductTopic, isObviouslyOffTopic, getOffTopicResponse } from "../topic-validator";
import { generateAIResponse } from "../ai-responder";
import { getUnifiedAIResponse } from "../unified-ai";
import { getCartProducts } from "../product-search";
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


export async function handleCollectingContactStage(
  tenantIds: string[],
  session: BotSession,
  userText: string
): Promise<StageResponse> {
  const { conversationContext, useUnifiedAI } = initializeStageContext(session);
  
  if (useUnifiedAI) {
    return await handleCollectingContactStageUnified(tenantIds, session, userText, conversationContext);
  }

  // Legacy approach
  // Check if we already have complete contact info (returning customer)
  if (hasCompleteContactInfo(session.contact)) {
    // Ask for confirmation of existing info
    if (matchesPattern(userText, CONFIRMATION_PATTERNS.YES)) {
      // Use common handler to create order
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
    
    if (matchesPattern(userText, CONFIRMATION_PATTERNS.NO)) {
      return {
        reply: "Customer wants to update their contact information. Clear the old info and ask for their name again.",
        newStage: "collecting_contact",
        updatedContact: {},
      };
    }
  }

  // Check if message is off-topic using common handler
  const offTopicResult = await handleOffTopicCheck(
    userText,
    "collecting_contact",
    conversationContext,
    { contactInfo: session.contact }
  );
  if (offTopicResult) {
    return offTopicResult;
  }

  const extracted: SalesIntent = await extractSalesIntent(userText, conversationContext, "collecting_contact");

  // Handle cancel
  if (extracted.intent === "cancel") {
    return await handleCancelIntent(userText, conversationContext);
  }

  // Merge contact info
  const updatedContact = {
    name: extracted.contact?.name || session.contact?.name,
    email: extracted.contact?.email || session.contact?.email,
    phone: extracted.contact?.phone || session.contact?.phone,
    address: extracted.contact?.address || session.contact?.address,
  };

  // Validate what we have
  const hasName = updatedContact.name && updatedContact.name.trim().length > 2;
  const hasValidPhone = updatedContact.phone && isValidPhone(updatedContact.phone);
  const hasValidEmail = updatedContact.email && isValidEmail(updatedContact.email);
  const hasAddress = updatedContact.address && updatedContact.address.trim().length > 3;

  // Ask for name if missing
  if (!hasName) {
    const reply = await generateAIResponse({
      stage: "collecting_contact",
      userMessage: userText,
      conversationHistory: conversationContext,
      contactInfo: updatedContact,
      systemContext: "Need customer's name to complete the order. Ask for their name politely.",
    });

    return {
      reply,
      newStage: "collecting_contact",
      updatedContact,
    };
  }

  // Ask for phone if missing
  if (!hasValidPhone && !hasValidEmail) {
    const reply = await generateAIResponse({
      stage: "collecting_contact",
      userMessage: userText,
      conversationHistory: conversationContext,
      contactInfo: updatedContact,
      systemContext: `Thank customer ${updatedContact.name} for providing their name. Now ask for their phone number or email so we can contact them about their order.`,
    });

    return {
      reply,
      newStage: "collecting_contact",
      updatedContact,
    };
  }

  // Ask for address if missing
  if (!hasAddress) {
    const reply = await generateAIResponse({
      stage: "collecting_contact",
      userMessage: userText,
      conversationHistory: conversationContext,
      contactInfo: updatedContact,
      systemContext: `Great! We have ${updatedContact.name}'s contact. Now ask where we should deliver the order. Request their full delivery address.`,
    });

    return {
      reply,
      newStage: "collecting_contact",
      updatedContact,
    };
  }

  // We have enough info! Create the order using common handler
  return await createOrderWithHandling({
    tenantIds,
    contact: normalizeContact(updatedContact),
    cart: session.cart,
    messengerSenderId: session.external_user_id,
    userText,
    conversationContext,
    includeOrderDetails: false,
  });
}

// ============================================
// UNIFIED VERSION - 50% faster
// ============================================
async function handleCollectingContactStageUnified(
  tenantIds: string[],
  session: BotSession,
  userText: string,
  conversationContext: Array<{ role: "user" | "assistant"; content: string }>
): Promise<StageResponse> {
  logger.info("🚀 Using unified AI approach for collecting_contact stage");

  // Check if we already have complete contact info
  if (hasCompleteContactInfo(session.contact)) {
    // Ask for confirmation of existing info
    if (matchesPattern(userText, CONFIRMATION_PATTERNS.YES)) {
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
  }

  // Make unified AI call to get intent AND response
  const result = await getUnifiedAIResponse({
    stage: "collecting_contact",
    userMessage: userText,
    conversationHistory: conversationContext,
    contactInfo: session.contact || {},
  });

  logger.info("Unified result:", { 
    intent: result.intent, 
    confidence: result.confidence,
    hasContact: !!result.contact 
  });

  // Handle cancel
  if (result.intent === "cancel") {
    return await handleCancelIntent(userText, conversationContext);
  }

  // Extract contact information from AI or merge with existing
  let updatedContact = { ...session.contact };
  let hasNewInfo = false;

  if (result.contact) {
    if (result.contact.name && result.contact.name.trim().length > 2) {
      updatedContact.name = result.contact.name.trim();
      hasNewInfo = true;
    }
    if (result.contact.email && isValidEmail(result.contact.email)) {
      updatedContact.email = result.contact.email.trim();
      hasNewInfo = true;
    }
    if (result.contact.phone && isValidPhone(result.contact.phone)) {
      updatedContact.phone = result.contact.phone.trim();
      hasNewInfo = true;
    }
    if (result.contact.address && result.contact.address.trim().length > 5) {
      updatedContact.address = result.contact.address.trim();
      hasNewInfo = true;
    }
  }

  // Check if we now have complete information
  if (hasCompleteContactInfo(updatedContact)) {
    // Create the order using common handler
    return await createOrderWithUnifiedAI({
      tenantIds,
      contact: normalizeContact(updatedContact),
      cart: session.cart,
      messengerSenderId: session.external_user_id,
      userText,
      conversationContext,
      includeOrderDetails: true, // Include detailed order info
    });
  }

  // Still missing information, continue collecting
  return {
    reply: result.reply,
    newStage: "collecting_contact",
    updatedContact: hasNewInfo ? updatedContact : undefined,
  };
}


