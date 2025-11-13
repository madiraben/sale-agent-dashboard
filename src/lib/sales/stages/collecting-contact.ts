import { extractSalesIntent, SalesIntent, isValidEmail, isValidPhone } from "../intent";
import { 
  BotSession, 
  clearCart, 
  getRecentConversation,
} from "../session";
import { createPendingOrder } from "../order";
import { validateProductTopic, isObviouslyOffTopic } from "../topic-validator";
import { generateAIResponse } from "../ai-responder";
import logger from "../../logger";
import { StageResponse } from "./types";

// ============================================
// STAGE 4: COLLECTING_CONTACT
// Collecting customer contact information
// ============================================
export async function handleCollectingContactStage(
  tenantIds: string[],
  session: BotSession,
  userText: string
): Promise<StageResponse> {
  const conversationContext = getRecentConversation(session.conversation_history);

  // Check if we already have complete contact info (returning customer)
  const hasCompleteInfo = session.contact?.name && 
    (session.contact?.phone || session.contact?.email) &&
    session.contact?.address;
  
  if (hasCompleteInfo) {
    // Ask for confirmation of existing info
    const lowerText = userText.toLowerCase().trim();
    const confrim_order = /^(yes|yeah|yep|sure|ok|okay|correct|confirm|that'?s? right|looks good|បាទ|ចាស)$/i.test(lowerText);
    if (confrim_order) {
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
          messengerSenderId: session.external_user_id,
        });

        const contactInfo = session.contact.phone || session.contact.email;
        const reply = await generateAIResponse({
          stage: "discovering",
          userMessage: userText,
          conversationHistory: conversationContext,
          systemContext: `Order #${result?.orderId} created successfully! Total: $${result?.total.toFixed(2)}, ${result?.itemCount} items. Thank customer ${session.contact.name} and confirm we'll contact them at ${contactInfo}. Ask if they need anything else.`,
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
          systemContext: `Error creating order: ${error.message}. Apologize sincerely and ask them to try again or contact support.`,
        });

        return {
          reply,
          newStage: "discovering",
          updatedCart: clearCart(),
          updatedContact: {},
        };
      }
    }
    const update_contact = /^(no|nope|nah|wrong|incorrect|change|update|ទេ)$/i.test(lowerText);
    if (update_contact) {
      return {
        reply: "Customer wants to update their contact information. Clear the old info and ask for their name again.",
        newStage: "collecting_contact",
        updatedContact: {},
      };
    }
  }

  // FIRST: Check if message is off-topic (before any processing)
  if (isObviouslyOffTopic(userText)) {
    logger.info("Off-topic query in collecting_contact stage (pattern match)");
    
    const reply = await generateAIResponse({
      stage: "collecting_contact",
      userMessage: userText,
      conversationHistory: conversationContext,
      contactInfo: session.contact,
      systemContext: "Customer asked off-topic question during checkout. Politely redirect them to complete their order. Ask for missing contact info.",
    });

    return {
      reply,
      newStage: "collecting_contact",
    };
  }

  const extracted: SalesIntent = await extractSalesIntent(userText, conversationContext, "collecting_contact");

  // Check if it's a query intent and validate topic
  if (extracted.intent === "query") {
    const topicValidation = await validateProductTopic(userText);
    
    if (!topicValidation.isOnTopic && topicValidation.confidence > 0.6) {
      logger.info("Off-topic query in collecting_contact stage", { 
        confidence: topicValidation.confidence 
      });

      const reply = await generateAIResponse({
        stage: "collecting_contact",
        userMessage: userText,
        conversationHistory: conversationContext,
        contactInfo: session.contact,
        systemContext: "Customer asked off-topic question. Say you can only help with product/order questions. Ask them to complete their order first by providing contact info.",
      });

      return {
        reply,
        newStage: "collecting_contact",
      };
    }
  }

  // Handle cancel
  if (extracted.intent === "cancel") {
    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: "Customer cancelled their order. Cart cleared. Ask if you can help with something else.",
    });

    return {
      reply,
      newStage: "discovering",
      updatedCart: clearCart(),
      updatedContact: {},
    };
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

  // We have enough info! Create the order
  try {
    const result = await createPendingOrder({
      tenantIds,
      contact: {
        name: updatedContact.name!,
        email: updatedContact.email || null,
        phone: updatedContact.phone || null,
      },
      cart: session.cart,
      messengerSenderId: session.external_user_id, // Link order to Messenger sender
    });

    const contactInfo = hasValidPhone ? updatedContact.phone : updatedContact.email;
    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: `Perfect! Order #${result?.orderId} created successfully! Total: $${result?.total.toFixed(2)}, ${result?.itemCount} items. Thank ${updatedContact.name} enthusiastically and confirm we'll contact them at ${contactInfo}. Ask if they need anything else.`,
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
      systemContext: `Error creating order: ${error.message}. Apologize sincerely and ask them to try again or contact support.`,
    });

    return {
      reply,
      newStage: "discovering",
      updatedCart: clearCart(),
      updatedContact: {},
    };
  }
}



