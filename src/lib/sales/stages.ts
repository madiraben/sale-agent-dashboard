import { extractSalesIntent, SalesIntent, isContactComplete, isValidEmail, isValidPhone } from "./intent";
import { runRagForUserTenants } from "@/lib/rag/engine";
import { 
  BotSession, 
  addToCart, 
  clearCart, 
  isCartEmpty,
  getRecentConversation,
  CartItem 
} from "./session";
import { createPendingOrder } from "./order";
import { 
  searchProducts, 
  getProductsByIds, 
  getCartProducts,
  formatCartDisplay,
  formatPendingProducts,
  Product 
} from "./product-search";
import { validateProductTopic, getOffTopicResponse, isObviouslyOffTopic } from "./topic-validator";
import logger from "../logger";

export type StageResponse = {
  reply: string;
  newStage: BotSession["stage"];
  updatedCart?: CartItem[];
  updatedPendingProducts?: Array<{ query: string; results: Product[] }>;
  updatedContact?: { name?: string; email?: string; phone?: string };
};

// ============================================
// STAGE 1: DISCOVERING
// User is browsing, asking questions, or starting to order
// ============================================
export async function handleDiscoveringStage(
  tenantIds: string[],
  session: BotSession,
  userText: string
): Promise<StageResponse> {
  const conversationContext = getRecentConversation(session.conversation_history);
  const extracted: SalesIntent = await extractSalesIntent(userText, conversationContext, "discovering");

  logger.info("Discovering stage intent:", { intent: extracted.intent, confidence: extracted.confidence });

  // Handle cancel/reset
  if (extracted.intent === "cancel") {
    return {
      reply: "No problem! Your cart has been cleared. How else can I help you?",
      newStage: "discovering",
      updatedCart: clearCart(),
      updatedPendingProducts: undefined,
    };
  }

  // Handle queries (product questions, general questions)
  if (extracted.intent === "query") {
    // First, check if question is obviously off-topic (fast check)
    if (isObviouslyOffTopic(userText)) {
      logger.info("Obviously off-topic query detected (pattern match)");
      return {
        reply: getOffTopicResponse(1.0),
        newStage: "discovering",
      };
    }

    // Validate topic using AI (more thorough check)
    const topicValidation = await validateProductTopic(userText);
    
    if (!topicValidation.isOnTopic && topicValidation.confidence > 0.6) {
      logger.info("Off-topic query detected", { 
        confidence: topicValidation.confidence, 
        reason: topicValidation.reason 
      });
      return {
        reply: getOffTopicResponse(topicValidation.confidence),
        newStage: "discovering",
      };
    }

    // Topic is valid, proceed with RAG
    const ragReply = await runRagForUserTenants(tenantIds, userText);
    let reply = ragReply;
    
    // If cart has items, remind user
    if (!isCartEmpty(session.cart)) {
      const cartProducts = await getCartProducts(tenantIds, session.cart);
      const cartSummary = formatCartDisplay(cartProducts);
      reply += `\n\n📦 Your cart:\n${cartSummary}\n\nReady to checkout? Just say "checkout" or "confirm order"!`;
    }
    
    return {
      reply,
      newStage: "discovering",
    };
  }

  // Handle order initiation or adding items
  if (extracted.intent === "order" || extracted.intent === "add_to_cart") {
    // Check if we have specific items mentioned
    if (!extracted.items || extracted.items.length === 0) {
      return {
        reply: "I'd be happy to help you order! What products would you like? You can tell me the product names and quantities.",
        newStage: "discovering",
      };
    }

    // Search for products
    const productSearches: Array<{ query: string; results: Product[] }> = [];
    
    for (const item of extracted.items) {
      const results = await searchProducts(tenantIds, item.name);
      if (results.length > 0) {
        productSearches.push({ query: item.name, results });
      }
    }

    if (productSearches.length === 0) {
      return {
        reply: `I couldn't find any products matching "${extracted.items.map(i => i.name).join('", "')}". Could you try describing them differently? Or ask me "what products do you have?"`,
        newStage: "discovering",
      };
    }

    // If we have clear matches (1 result per query), add to cart automatically
    const clearMatches = productSearches.every(s => s.results.length === 1);
    
    if (clearMatches) {
      let updatedCart = session.cart;
      
      for (let i = 0; i < productSearches.length; i++) {
        const product = productSearches[i].results[0];
        const requestedQty = extracted.items![i].qty || 1;
        
        updatedCart = addToCart(updatedCart, {
          product_id: product.id,
          name: product.name,
          qty: requestedQty,
          price: product.price,
        });
      }
      
      // Fetch actual product data for display
      const cartProducts = await getCartProducts(tenantIds, updatedCart);
      const cartDisplay = formatCartDisplay(cartProducts);
      
      return {
        reply: `Great! I've added those items to your cart.\n\n${cartDisplay}\n\nWould you like to:\n• Add more items\n• Proceed to checkout (say "checkout")\n• Modify your cart`,
        newStage: "discovering",
        updatedCart,
        updatedPendingProducts: undefined,
      };
    }

    // Multiple matches - need user to select
    let reply = "I found several products that might match what you're looking for:\n\n";
    
    productSearches.forEach((search, idx) => {
      reply += `For "${search.query}":\n`;
      search.results.forEach((product, pIdx) => {
        reply += `  ${pIdx + 1}. ${product.name} - $${product.price.toFixed(2)}\n`;
      });
      reply += "\n";
    });
    
    reply += "Please tell me which products you'd like (e.g., 'I want product 1 for query A and product 2 for query B'), or describe them more specifically.";
    
    return {
      reply,
      newStage: "confirming_products",
      updatedPendingProducts: productSearches,
    };
  }

  // Handle checkout initiation
  if (extracted.intent === "confirm_order") {
    if (isCartEmpty(session.cart)) {
      return {
        reply: "Your cart is empty! What would you like to order?",
        newStage: "discovering",
      };
    }

    // Move to confirming order
    const cartProducts = await getCartProducts(tenantIds, session.cart);
    const cartDisplay = formatCartDisplay(cartProducts);
    
    return {
      reply: `Perfect! Let me confirm your order:\n\n${cartDisplay}\n\nIs this correct? Reply "yes" to confirm or "no" to modify.`,
      newStage: "confirming_order",
    };
  }

  // Default fallback
  const greeting = "Hello! I'm here to help you shop. You can:\n• Ask about our products\n• Place an order\n• Get product recommendations\n\nWhat would you like to do?";
  
  return {
    reply: greeting,
    newStage: "discovering",
  };
}

// ============================================
// STAGE 2: CONFIRMING_PRODUCTS
// User needs to select from multiple product matches
// ============================================
export async function handleConfirmingProductsStage(
  tenantIds: string[],
  session: BotSession,
  userText: string
): Promise<StageResponse> {
  // FIRST: Check if message is off-topic (before any processing)
  if (isObviouslyOffTopic(userText)) {
    logger.info("Off-topic query in confirming_products stage (pattern match)");
    return {
      reply: "I can only help with product selection. Which product would you like from the options shown?",
      newStage: "confirming_products",
    };
  }

  const conversationContext = getRecentConversation(session.conversation_history);
  const extracted: SalesIntent = await extractSalesIntent(userText, conversationContext, "confirming_products");

  // Check if it's a query and validate topic
  if (extracted.intent === "query") {
    const topicValidation = await validateProductTopic(userText);
    
    if (!topicValidation.isOnTopic && topicValidation.confidence > 0.6) {
      logger.info("Off-topic query in confirming_products stage", { 
        confidence: topicValidation.confidence 
      });
      return {
        reply: "I can only answer product questions. Please select a product from the options, or tell me what you're looking for.",
        newStage: "confirming_products",
      };
    }
  }

  // Handle cancel
  if (extracted.intent === "cancel") {
    return {
      reply: "Okay, I've cleared the product selection. What would you like to do instead?",
      newStage: "discovering",
      updatedPendingProducts: undefined,
    };
  }

  // Check if user is providing more specific info or selections
  if (!session.pending_products || session.pending_products.length === 0) {
    // No pending products, go back to discovering
    return {
      reply: "Let's start over. What products would you like to order?",
      newStage: "discovering",
      updatedPendingProducts: undefined,
    };
  }

  // Try to extract item selection from user's response
  // This is a simplified approach - in production you might use more sophisticated NLP
  const productIds = extractProductIdsFromSelection(userText, session.pending_products);
  
  if (productIds.length > 0) {
    const products = await getProductsByIds(tenantIds, productIds);
    let updatedCart = session.cart;
    
    for (const product of products) {
      updatedCart = addToCart(updatedCart, {
        product_id: product.id,
        name: product.name,
        qty: 1, // Default qty, user can modify later
        price: product.price,
      });
    }
    
    const cartProducts = await getCartProducts(tenantIds, updatedCart);
    const cartDisplay = formatCartDisplay(cartProducts);
    
    return {
      reply: `Perfect! I've added those to your cart.\n\n${cartDisplay}\n\nWould you like to add more items or proceed to checkout?`,
      newStage: "discovering",
      updatedCart,
      updatedPendingProducts: undefined,
    };
  }

  // If we have new items mentioned, search for those
  if (extracted.items && extracted.items.length > 0) {
    // User is refining their search
    const newSearches: Array<{ query: string; results: Product[] }> = [];
    
    for (const item of extracted.items) {
      const results = await searchProducts(tenantIds, item.name);
      if (results.length > 0) {
        newSearches.push({ query: item.name, results });
      }
    }

    if (newSearches.length === 0) {
      return {
        reply: `I still couldn't find products matching that. Here are the products I found earlier:\n\n${formatPendingProducts(session.pending_products)}\n\nWhich one would you like?`,
        newStage: "confirming_products",
      };
    }

    // Check if we have single matches now
    const clearMatches = newSearches.every(s => s.results.length === 1);
    
    if (clearMatches) {
      let updatedCart = session.cart;
      
      for (const search of newSearches) {
        const product = search.results[0];
        updatedCart = addToCart(updatedCart, {
          product_id: product.id,
          name: product.name,
          qty: 1,
          price: product.price,
        });
      }
      
      const cartProducts = await getCartProducts(tenantIds, updatedCart);
      const cartDisplay = formatCartDisplay(cartProducts);
      
      return {
        reply: `Great! Added to cart.\n\n${cartDisplay}\n\nAnything else?`,
        newStage: "discovering",
        updatedCart,
        updatedPendingProducts: undefined,
      };
    }

    // Still multiple matches
    let reply = "I found these products:\n\n";
    newSearches.forEach((search) => {
      reply += `For "${search.query}":\n`;
      search.results.forEach((product, idx) => {
        reply += `  ${idx + 1}. ${product.name} - $${product.price.toFixed(2)}\n`;
      });
      reply += "\n";
    });
    reply += "Which specific product would you like? You can say the exact name.";
    
    return {
      reply,
      newStage: "confirming_products",
      updatedPendingProducts: newSearches,
    };
  }

  // Fallback
  return {
    reply: `Let me show you the products again:\n\n${formatPendingProducts(session.pending_products)}\n\nWhich would you like? Please tell me the product name.`,
    newStage: "confirming_products",
  };
}

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
  const extracted: SalesIntent = await extractSalesIntent(userText, conversationContext, "confirming_order");
  
  const lowerText = userText.toLowerCase().trim();

  // Handle confirmation
  if (extracted.intent === "confirm_order" || 
      /^(yes|yeah|yep|sure|ok|okay|correct|confirm|that'?s? right|looks good|proceed)$/i.test(lowerText)) {
    
    if (isCartEmpty(session.cart)) {
      return {
        reply: "Your cart is empty! Let's add some products first.",
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
          },
          cart: session.cart,
          messengerSenderId: session.external_user_id, // Link order to Messenger sender
        });

        return {
          reply: `🎉 Order confirmed! Order #${result?.orderId}\n\nTotal: $${result?.total.toFixed(2)}\nItems: ${result?.itemCount}\n\nThank you ${session.contact.name}! We'll contact you soon at ${session.contact.phone || session.contact.email}.\n\nNeed anything else?`,
          newStage: "discovering",
          updatedCart: clearCart(),
          updatedContact: {},
        };
      } catch (error: any) {
        logger.error("Order creation failed:", error);
        return {
          reply: `Sorry, there was an error creating your order: ${error.message}\n\nPlease try again or contact support.`,
          newStage: "discovering",
        };
      }
    }

    // Need contact info
    return {
      reply: "Great! To complete your order, I'll need your contact information.\n\nWhat's your name?",
      newStage: "collecting_contact",
    };
  }

  // Handle cancellation
  if (extracted.intent === "cancel" || 
      /^(no|nope|cancel|stop|nevermind|never mind)$/i.test(lowerText)) {
    return {
      reply: "No problem! Your cart has been cleared. Would you like to start a new order?",
      newStage: "discovering",
      updatedCart: clearCart(),
    };
  }

  // Handle modifications
  if (extracted.intent === "modify_cart") {
    const cartProducts = await getCartProducts(tenantIds, session.cart);
    const cartDisplay = formatCartDisplay(cartProducts);
    
    return {
      reply: `Current cart:\n\n${cartDisplay}\n\nWhat would you like to change? You can:\n• Add more products\n• Remove items\n• Change quantities`,
      newStage: "discovering",
    };
  }

  // User asking questions during confirmation
  if (extracted.intent === "query") {
    // Check if question is off-topic
    if (isObviouslyOffTopic(userText)) {
      const cartProducts = await getCartProducts(tenantIds, session.cart);
      const cartDisplay = formatCartDisplay(cartProducts);
      return {
        reply: `I can only help with product and order questions.\n\nYour cart:\n${cartDisplay}\n\nReady to confirm? (yes/no)`,
        newStage: "confirming_order",
      };
    }

    const topicValidation = await validateProductTopic(userText);
    
    if (!topicValidation.isOnTopic && topicValidation.confidence > 0.6) {
      const cartProducts = await getCartProducts(tenantIds, session.cart);
      const cartDisplay = formatCartDisplay(cartProducts);
      return {
        reply: `I can only answer product-related questions.\n\nYour cart:\n${cartDisplay}\n\nReady to confirm? (yes/no)`,
        newStage: "confirming_order",
      };
    }

    const ragReply = await runRagForUserTenants(tenantIds, userText);
    const cartProducts = await getCartProducts(tenantIds, session.cart);
    const cartDisplay = formatCartDisplay(cartProducts);
    
    return {
      reply: `${ragReply}\n\nYour cart:\n${cartDisplay}\n\nReady to confirm? (yes/no)`,
      newStage: "confirming_order",
    };
  }

  // Fallback
  const cartProducts = await getCartProducts(tenantIds, session.cart);
  const cartDisplay = formatCartDisplay(cartProducts);
  
  return {
    reply: `Your order:\n\n${cartDisplay}\n\nIs this correct? Reply "yes" to proceed or "no" to cancel.`,
    newStage: "confirming_order",
  };
}

// ============================================
// STAGE 4: COLLECTING_CONTACT
// Collecting customer contact information
// ============================================
export async function handleCollectingContactStage(
  tenantIds: string[],
  session: BotSession,
  userText: string
): Promise<StageResponse> {
  // Check if we already have complete contact info (returning customer)
  const hasCompleteInfo = session.contact?.name && 
    (session.contact?.phone || session.contact?.email);
  
  if (hasCompleteInfo) {
    // Ask for confirmation of existing info
    const lowerText = userText.toLowerCase().trim();
    
    if (/^(yes|yeah|yep|sure|ok|okay|correct|confirm|that'?s? right|looks good)$/i.test(lowerText)) {
      // Customer confirmed their info, create order
      try {
        const result = await createPendingOrder({
          tenantIds,
          contact: {
            name: session.contact.name!,
            email: session.contact.email || null,
            phone: session.contact.phone || null,
          },
          cart: session.cart,
          messengerSenderId: session.external_user_id,
        });

        const contactInfo = session.contact.phone || session.contact.email;

        return {
          reply: `🎉 Perfect! Order #${result?.orderId} created successfully!\n\nTotal: $${result?.total.toFixed(2)}\nItems: ${result?.itemCount}\n\nThank you ${session.contact.name}! We'll reach out to you at ${contactInfo}.\n\nAnything else I can help with?`,
          newStage: "discovering",
          updatedCart: clearCart(),
          updatedContact: {},
        };
      } catch (error: any) {
        logger.error("Order creation failed:", error);
        return {
          reply: `Sorry, there was an error creating your order: ${error.message}\n\nPlease try again or contact support.`,
          newStage: "discovering",
          updatedCart: clearCart(),
          updatedContact: {},
        };
      }
    }
    
    if (/^(no|nope|nah|wrong|incorrect|change|update)$/i.test(lowerText)) {
      // Customer wants to update their info
      return {
        reply: "No problem! Let's update your information.\n\nWhat's your name?",
        newStage: "collecting_contact",
        updatedContact: {}, // Clear existing contact
      };
    }
    
    // Show confirmation prompt
    const contactInfo = session.contact.phone || session.contact.email;
    return {
      reply: `I have your info on file:\n\nName: ${session.contact.name}\nContact: ${contactInfo}\n\nIs this still correct? (yes/no)`,
      newStage: "collecting_contact",
    };
  }

  // FIRST: Check if message is off-topic (before any processing)
  if (isObviouslyOffTopic(userText)) {
    logger.info("Off-topic query in collecting_contact stage (pattern match)");
    return {
      reply: "I can only help with your order right now. Please provide your contact information.\n\nWhat's your name?",
      newStage: "collecting_contact",
    };
  }

  const conversationContext = getRecentConversation(session.conversation_history);
  const extracted: SalesIntent = await extractSalesIntent(userText, conversationContext, "collecting_contact");

  // Check if it's a query intent and validate topic
  if (extracted.intent === "query") {
    const topicValidation = await validateProductTopic(userText);
    
    if (!topicValidation.isOnTopic && topicValidation.confidence > 0.6) {
      logger.info("Off-topic query in collecting_contact stage", { 
        confidence: topicValidation.confidence 
      });
      return {
        reply: "I can only help with product and order questions. Let's complete your order first.\n\nWhat's your name?",
        newStage: "collecting_contact",
      };
    }
  }

  // Handle cancel
  if (extracted.intent === "cancel") {
    return {
      reply: "Order cancelled. Your cart has been cleared. Can I help you with something else?",
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
  };

  // Validate what we have
  const hasName = updatedContact.name && updatedContact.name.trim().length > 2;
  const hasValidPhone = updatedContact.phone && isValidPhone(updatedContact.phone);
  const hasValidEmail = updatedContact.email && isValidEmail(updatedContact.email);

  // Ask for name if missing
  if (!hasName) {
    return {
      reply: "What's your name?",
      newStage: "collecting_contact",
      updatedContact,
    };
  }

  // Ask for phone or email if both missing
  if (!hasValidPhone && !hasValidEmail) {
    return {
      reply: `Thanks ${updatedContact.name}! What's the best way to reach you? Please provide your phone number or email address.`,
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

    return {
      reply: `🎉 Perfect! Order #${result?.orderId} created successfully!\n\nTotal: $${result?.total.toFixed(2)}\nItems: ${result?.itemCount}\n\nThank you ${updatedContact.name}! We'll reach out to you at ${contactInfo}.\n\nAnything else I can help with?`,
      newStage: "discovering",
      updatedCart: clearCart(),
      updatedContact: {},
    };
  } catch (error: any) {
    logger.error("Order creation failed:", error);
    return {
      reply: `Sorry, there was an error creating your order: ${error.message}\n\nPlease try again or contact support.`,
      newStage: "discovering",
      updatedCart: clearCart(),
      updatedContact: {},
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractProductIdsFromSelection(
  userText: string,
  pendingProducts: Array<{ query: string; results: any[] }>
): string[] {
  // Simple extraction logic - match product names exactly
  const ids: string[] = [];
  const lowerText = userText.toLowerCase();
  
  pendingProducts.forEach((search) => {
    search.results.forEach((product: any) => {
      if (lowerText.includes(product.name.toLowerCase())) {
        ids.push(product.id);
      }
    });
  });
  
  return ids;
}
