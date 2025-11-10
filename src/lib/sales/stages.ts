import { extractSalesIntent, SalesIntent, isContactComplete, isValidEmail, isValidPhone } from "./intent";
import { runRagForUserTenants } from "@/lib/rag/engine";
import { 
  BotSession, 
  addToCart, 
  clearCart, 
  isCartEmpty,
  removeFromCart,
  updateCartItemQty,
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
import { generateAIResponse } from "./ai-responder";
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
    };
  }

  // Handle queries (product questions, general questions)
  if (extracted.intent === "query") {
    // First, check if question is obviously off-topic (fast check)
    if (isObviouslyOffTopic(userText)) {
      logger.info("Obviously off-topic query detected (pattern match)");
      return {
        reply: getOffTopicResponse(1.0, userText),
        newStage: "discovering",
      };
    }

    // Validate topic using AI (more thorough check)
    const topicValidation = await validateProductTopic(userText);

    logger.info("Topic validation:", topicValidation);
    
    if (!topicValidation.isOnTopic && topicValidation.confidence > 0.6) {
      logger.info("Off-topic query detected", { 
        confidence: topicValidation.confidence, 
        reason: topicValidation.reason 
      });
      return {
        reply: getOffTopicResponse(topicValidation.confidence, userText),
        newStage: "discovering",
      };
    }

    // Check if user is asking specifically about their cart
    const isCartQuery = isAskingAboutCart(userText);
    
    if (isCartQuery) {
      logger.info("Cart-specific query detected");
      
      if (isCartEmpty(session.cart)) {
        const reply = await generateAIResponse({
          stage: "discovering",
          userMessage: userText,
          conversationHistory: conversationContext,
          systemContext: "Customer asked about their cart, but cart is empty. Let them know cart is empty and ask what they'd like to order.",
        });
        
        return {
          reply,
          newStage: "discovering",
        };
      }
      
      // Show cart contents with AI-generated response
      const cartProducts = await getCartProducts(tenantIds, session.cart);
      const cartSummary = formatCartDisplay(cartProducts);
      
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        cartSummary,
        systemContext: "Customer asked about their cart. Show them what's in their cart and ask if they want to add more items, modify, or proceed to checkout.",
      });
      
      return {
        reply,
        newStage: "discovering",
      };
    }

    // Check if user is asking to browse/see products (not a specific search)
    const isBrowsingQuery = isAskingToBrowseProducts(userText);
    
    if (isBrowsingQuery) {
      logger.info("Product browsing query detected - searching actual products");
      
      // Extract category/type if mentioned (shirt, shoes, etc.)
      const searchTerm = extractProductTypeFromQuery(userText);
      const products = await searchProducts(tenantIds, searchTerm || "");
      
      if (products.length === 0) {
        const reply = await generateAIResponse({
          stage: "discovering",
          userMessage: userText,
          conversationHistory: conversationContext,
          systemContext: "No products found in database. Let customer know we don't have products available right now and apologize.",
        });
        
        return {
          reply,
          newStage: "discovering",
        };
      }
      
      // Format actual products from database
      let productList = products.slice(0, 10).map((p, idx) => 
        `${idx + 1}. **${p.name}** - $${p.price.toFixed(2)}${p.description ? `\n   - ${p.description.substring(0, 80)}${p.description.length > 80 ? '...' : ''}` : ''}`
      ).join('\n\n');
      
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        productResults: productList,
        systemContext: `Customer wants to browse products. Show them these REAL products from our database. Ask which one they'd like to add to their cart. DO NOT make up or invent products - only show what's provided.`,
      });
      
      return {
        reply,
        newStage: "discovering",
      };
    }

    // Topic is valid, proceed with RAG for product questions
    const ragReply = await runRagForUserTenants(tenantIds, userText);
    
    // If cart has items, remind user after answering their question
    if (!isCartEmpty(session.cart)) {
      const cartProducts = await getCartProducts(tenantIds, session.cart);
      const cartSummary = formatCartDisplay(cartProducts);
      
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        cartSummary,
        systemContext: `Answer customer's question: ${ragReply}\n\nThen remind them about their cart and suggest they can continue shopping or checkout.`,
      });
      
      return {
        reply,
        newStage: "discovering",
      };
    }
    
    // No cart items, just return RAG answer with AI response
    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: `Answer from knowledge base: ${ragReply}\n\nProvide this answer naturally and ask if they need help with anything else.`,
    });
    
    return {
      reply,
      newStage: "discovering",
    };
  }

  // Handle cart modifications (remove items, change quantities)
  if (extracted.intent === "modify_cart") {
    logger.info("Modify cart intent detected");

    if (isCartEmpty(session.cart)) {
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        systemContext: "Customer wants to modify cart but it's empty. Let them know and ask what they'd like to order.",
      });

      return {
        reply,
        newStage: "discovering",
      };
    }

    // Detect what kind of modification (remove, change quantity, clear all)
    const modification = detectCartModification(userText, session.cart);
    
    if (modification.action === "remove" && modification.productId) {
      // Remove specific item
      const itemToRemove = session.cart.find(item => item.product_id === modification.productId);
      const updatedCart = removeFromCart(session.cart, modification.productId);
      
      const cartProducts = updatedCart.length > 0 ? await getCartProducts(tenantIds, updatedCart) : [];
      const cartDisplay = updatedCart.length > 0 ? formatCartDisplay(cartProducts) : "";
      
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        cartSummary: cartDisplay,
        systemContext: `Successfully removed "${itemToRemove?.name}" from cart. ${updatedCart.length > 0 ? 'Show updated cart and ask if they want to continue shopping or checkout.' : 'Cart is now empty. Ask what they would like to order.'}`,
      });

      return {
        reply,
        newStage: "discovering",
        updatedCart,
      };
    }
    
    if (modification.action === "change_quantity" && modification.productId && modification.newQuantity) {
      // Update quantity
      const updatedCart = updateCartItemQty(session.cart, modification.productId, modification.newQuantity);
      const cartProducts = await getCartProducts(tenantIds, updatedCart);
      const cartDisplay = formatCartDisplay(cartProducts);
      
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        cartSummary: cartDisplay,
        systemContext: `Updated item quantity to ${modification.newQuantity}. Show updated cart and ask if they need anything else.`,
      });

      return {
        reply,
        newStage: "discovering",
        updatedCart,
      };
    }
    
    if (modification.action === "clear_all") {
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        systemContext: "Customer wants to clear their entire cart. Confirm cart has been cleared and ask what they'd like to order.",
      });

      return {
        reply,
        newStage: "discovering",
        updatedCart: clearCart(),
      };
    }

    // If we couldn't determine specific action, show cart and ask for clarification
    const cartProducts = await getCartProducts(tenantIds, session.cart);
    const cartDisplay = formatCartDisplay(cartProducts);
    
    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      cartSummary: cartDisplay,
      systemContext: "Customer wants to modify cart but request was unclear. Show current cart and ask what specific changes they want (remove item, change quantity, etc.).",
    });

    return {
      reply,
      newStage: "discovering",
    };
  }

  // Handle order initiation or adding items
  if (extracted.intent === "order" || extracted.intent === "add_to_cart") {
    // Check if we have specific items mentioned
    if (!extracted.items || extracted.items.length === 0) {
      // Fallback: Check if user is confirming a previous recommendation
      const lowerText = userText.toLowerCase().trim();
      const isConfirming = /^(yes|yeah|yep|sure|ok|okay|okie|i('ll| will)? take (it|one|that)|add (it|that|one))$/i.test(lowerText);
      
      if (isConfirming && session.conversation_history && session.conversation_history.length > 0) {
        // Try to extract product names from last bot message
        const lastBotMessage = [...session.conversation_history]
          .reverse()
          .find(msg => msg.role === "assistant");
          
        if (lastBotMessage) {
          // Look for product names in the message (format: "ProductName" or **ProductName**)
          const productNameMatch = lastBotMessage.content.match(/(?:recommend|available|have|suggest)\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?)(?:\s+for|\s+at|\s+,|\s+which|\s+\$)/i);
          
          if (productNameMatch) {
            const productName = productNameMatch[1].trim();
            logger.info(`Fallback: Extracted product from last bot message: ${productName}`);
            
            // Search for this product
            const results = await searchProducts(tenantIds, productName);
            
            if (results.length > 0) {
              extracted.items = [{ name: productName, qty: 1 }];
              // Continue to normal flow below
            }
          }
        }
      }
      
      // If still no items, ask for clarification
      if (!extracted.items || extracted.items.length === 0) {
        const reply = await generateAIResponse({
          stage: "discovering",
          userMessage: userText,
          conversationHistory: conversationContext,
          systemContext: "Customer wants to order but didn't specify which products. Ask them what they'd like to order.",
        });

        return {
          reply,
          newStage: "discovering",
        };
      }
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
      const productNames = extracted.items.map(i => i.name).join(", ");
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        systemContext: `No products found matching: "${productNames}". Apologize and suggest they describe differently or ask what products are available.`,
      });

      return {
        reply,
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
      
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        cartSummary: cartDisplay,
        systemContext: "Products successfully added to cart! Show enthusiasm. Ask if they want to add more items or proceed to checkout.",
      });

      return {
        reply,
        newStage: "discovering",
        updatedCart,
        updatedPendingProducts: undefined,
      };
    }

    // Multiple matches - need user to select
    let productResults = "";
    
    productSearches.forEach((search, idx) => {
      productResults += `For "${search.query}":\n`;
      search.results.forEach((product, pIdx) => {
        productResults += `  ${pIdx + 1}. ${product.name} - $${product.price.toFixed(2)}\n`;
      });
      productResults += "\n";
    });
    
    const reply = await generateAIResponse({
      stage: "confirming_products",
      userMessage: userText,
      conversationHistory: conversationContext,
      productResults,
      systemContext: "Multiple products found. Show the options and ask customer to specify which one they want.",
    });
    
    return {
      reply,
      newStage: "confirming_products",
      updatedPendingProducts: productSearches,
    };
  }

  // Handle checkout initiation
  if (extracted.intent === "confirm_order") {
    if (isCartEmpty(session.cart)) {
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        systemContext: "Customer tried to checkout but cart is empty. Let them know and ask what they'd like to order.",
      });

      return {
        reply,
        newStage: "discovering",
      };
    }

    // Move to confirming order
    const cartProducts = await getCartProducts(tenantIds, session.cart);
    const cartDisplay = formatCartDisplay(cartProducts);
    
    const reply = await generateAIResponse({
      stage: "confirming_order",
      userMessage: userText,
      conversationHistory: conversationContext,
      cartSummary: cartDisplay,
      systemContext: "Customer wants to checkout. Show their cart and ask them to confirm the order (yes/no).",
    });
    
    return {
      reply,
      newStage: "confirming_order",
    };
  }

  // Default fallback - greeting or general help
  const reply = await generateAIResponse({
    stage: "discovering",
    userMessage: userText,
    conversationHistory: conversationContext,
    cartSummary: !isCartEmpty(session.cart) ? await formatCartDisplay(await getCartProducts(tenantIds, session.cart)) : undefined,
    systemContext: "Customer is browsing or just starting. Greet them warmly and offer to help with shopping.",
  });

  return {
    reply,
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
  const conversationContext = getRecentConversation(session.conversation_history);

  // FIRST: Check if message is off-topic (before any processing)
  if (isObviouslyOffTopic(userText)) {
    logger.info("Off-topic query in confirming_products stage (pattern match)");
    
    const productResults = session.pending_products ? formatPendingProducts(session.pending_products) : "";
    const reply = await generateAIResponse({
      stage: "confirming_products",
      userMessage: userText,
      conversationHistory: conversationContext,
      productResults,
      systemContext: "Customer asked off-topic question. Politely redirect them to select a product from the options.",
    });

    return {
      reply,
      newStage: "confirming_products",
    };
  }

  const extracted: SalesIntent = await extractSalesIntent(userText, conversationContext, "confirming_products");

  // Check if it's a query and validate topic
  if (extracted.intent === "query") {
    const topicValidation = await validateProductTopic(userText);
    
    if (!topicValidation.isOnTopic && topicValidation.confidence > 0.6) {
      logger.info("Off-topic query in confirming_products stage", { 
        confidence: topicValidation.confidence 
      });

      const productResults = session.pending_products ? formatPendingProducts(session.pending_products) : "";
      const reply = await generateAIResponse({
        stage: "confirming_products",
        userMessage: userText,
        conversationHistory: conversationContext,
        productResults,
        systemContext: "Customer asked off-topic question. Politely say you can only answer product questions and redirect to selection.",
      });

      return {
        reply,
        newStage: "confirming_products",
      };
    }
  }

  // Handle cancel
  if (extracted.intent === "cancel") {
    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: "Customer cancelled product selection. Product selection cleared. Ask what they'd like to do instead.",
    });

    return {
      reply,
      newStage: "discovering",
      updatedPendingProducts: undefined,
    };
  }

  // Check if user is providing more specific info or selections
  if (!session.pending_products || session.pending_products.length === 0) {
    // No pending products, go back to discovering
    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: "No pending products found. Ask customer what products they'd like to order.",
    });

    return {
      reply,
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
    
    const reply = await generateAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      cartSummary: cartDisplay,
      systemContext: "Products added to cart successfully! Ask if they want to add more items or checkout.",
    });
    
    return {
      reply,
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
      const productResults = formatPendingProducts(session.pending_products);
      const reply = await generateAIResponse({
        stage: "confirming_products",
        userMessage: userText,
        conversationHistory: conversationContext,
        productResults,
        systemContext: "No products found with the new search terms. Show the original product options again and ask them to choose.",
      });

      return {
        reply,
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
      
      const reply = await generateAIResponse({
        stage: "discovering",
        userMessage: userText,
        conversationHistory: conversationContext,
        cartSummary: cartDisplay,
        systemContext: "Products added to cart! Ask if they want anything else.",
      });
      
      return {
        reply,
        newStage: "discovering",
        updatedCart,
        updatedPendingProducts: undefined,
      };
    }

    // Still multiple matches
    let productResults = "";
    newSearches.forEach((search) => {
      productResults += `For "${search.query}":\n`;
      search.results.forEach((product, idx) => {
        productResults += `  ${idx + 1}. ${product.name} - $${product.price.toFixed(2)}\n`;
      });
      productResults += "\n";
    });
    
    const reply = await generateAIResponse({
      stage: "confirming_products",
      userMessage: userText,
      conversationHistory: conversationContext,
      productResults,
      systemContext: "Still multiple products found. Show options and ask customer to specify which one they want by name.",
    });
    
    return {
      reply,
      newStage: "confirming_products",
      updatedPendingProducts: newSearches,
    };
  }

  // Fallback
  const productResults = formatPendingProducts(session.pending_products);
  const reply = await generateAIResponse({
    stage: "confirming_products",
    userMessage: userText,
    conversationHistory: conversationContext,
    productResults,
    systemContext: "Show the product options again and ask customer to tell you which one they want by name.",
  });

  return {
    reply,
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
    
    if (/^(yes|yeah|yep|sure|ok|okay|correct|confirm|that'?s? right|looks good|បាទ|ចាស)$/i.test(lowerText)) {
      // Customer confirmed their info, create order
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
    
    if (/^(no|nope|nah|wrong|incorrect|change|update|ទេ)$/i.test(lowerText)) {
      // Customer wants to update their info
      const reply = await generateAIResponse({
        stage: "collecting_contact",
        userMessage: userText,
        conversationHistory: conversationContext,
        systemContext: "Customer wants to update their contact information. Clear the old info and ask for their name again.",
      });

      return {
        reply,
        newStage: "collecting_contact",
        updatedContact: {}, // Clear existing contact
      };
    }
    
    // Show confirmation prompt
    const contactInfo = session.contact.phone || session.contact.email;
    const reply = await generateAIResponse({
      stage: "collecting_contact",
      userMessage: userText,
      conversationHistory: conversationContext,
      contactInfo: session.contact,
      systemContext: `We have customer's info on file: ${session.contact.name}, ${contactInfo}, Address: ${session.contact.address}. Ask if this is still correct (yes/no).`,
    });

    return {
      reply,
      newStage: "collecting_contact",
    };
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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Detect what cart modification the user wants to make
 */
function detectCartModification(
  userText: string,
  cart: CartItem[]
): { 
  action: "remove" | "change_quantity" | "clear_all" | "unknown";
  productId?: string;
  newQuantity?: number;
} {
  const lowerText = userText.toLowerCase().trim();

  // Check for clear all cart
  if (
    /clear (my |the )?cart/i.test(lowerText) ||
    /empty (my |the )?cart/i.test(lowerText) ||
    /remove (all|everything)/i.test(lowerText) ||
    /delete (all|everything)/i.test(lowerText) ||
    /លុបទាំងអស់/i.test(userText) // Khmer: delete all
  ) {
    return { action: "clear_all" };
  }

  // Check for quantity change patterns
  const qtyMatch = lowerText.match(/change (to |quantity to )?(\d+)|make it (\d+)|update (to |quantity to )?(\d+)/i);
  if (qtyMatch) {
    const newQty = parseInt(qtyMatch[2] || qtyMatch[3] || qtyMatch[5]);
    // Try to find which product (usually the last one added or mentioned)
    const productId = cart.length > 0 ? cart[cart.length - 1].product_id : undefined;
    return { action: "change_quantity", productId, newQuantity: newQty };
  }

  // Check for removal patterns
  const isRemoval = 
    /remove|delete|take out|get rid of/i.test(lowerText) ||
    /ដក|លុប/i.test(userText); // Khmer: remove/delete

  if (isRemoval) {
    // Try to find which product to remove
    
    // Pattern 1: "remove that item" or "remove it" or "delete that" - referring to most recent/context
    if (
      /remove (that|the|this) (item|one|product)/i.test(lowerText) ||
      /delete (that|the|this|it)/i.test(lowerText) ||
      /remove it/i.test(lowerText) ||
      /take (it|that) out/i.test(lowerText)
    ) {
      // Remove the last item in cart (most likely what they're referring to)
      const productId = cart.length > 0 ? cart[cart.length - 1].product_id : undefined;
      return { action: "remove", productId };
    }

    // Pattern 2: Try to match product name in the message
    for (const item of cart) {
      if (lowerText.includes(item.name.toLowerCase())) {
        return { action: "remove", productId: item.product_id };
      }
    }

    // Pattern 3: If only one item in cart, remove it
    if (cart.length === 1) {
      return { action: "remove", productId: cart[0].product_id };
    }

    // If multiple items and unclear which one, return unknown
    return { action: "unknown" };
  }

  return { action: "unknown" };
}

/**
 * Detect if user wants to browse/see products (not a specific item search)
 */
function isAskingToBrowseProducts(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  // English browsing patterns
  const englishPatterns = [
    /what (do you|products|items) (have|got|sell)/i,
    /show me (your )?(products|items|catalog|inventory)/i,
    /what (products|items) (are|do you have) (available|in stock)/i,
    /can i see (your )?(products|items|catalog)/i,
    /browse (your )?(products|items|catalog)/i,
    /what('?s| is) (available|for sale)/i,
    /what can i (buy|order|get|purchase)/i,
    /(looking|searching) for (a |some )?(shirt|shoes|product|item)/i,
    /want to buy (a |some )?(shirt|shoes|product|item)/i,
    /need (a |some )?(shirt|shoes|product|item)/i,
  ];
  
  // Khmer browsing patterns
  const khmerPatterns = [
    /មានផលិតផលអ្វីខ្លះ/,  // What products do you have
    /មានអីលក់/,  // What do you sell
    /មានអីខ្លះ/,  // What do you have
    /បង្ហាញផលិតផល/,  // Show products
    /ចង់មើលផលិតផល/,  // Want to see products
    /ចង់ទិញ.*?(អាវ|ស្បែកជើង)/,  // Want to buy (shirt|shoes)
  ];
  
  const allPatterns = [...englishPatterns, ...khmerPatterns];
  return allPatterns.some(pattern => pattern.test(lowerMessage) || pattern.test(message));
}

/**
 * Extract product type/category from browsing query
 */
function extractProductTypeFromQuery(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Common product types
  const productTypes: Record<string, string[]> = {
    'shirt': ['shirt', 'tshirt', 't-shirt', 'jersey', 'top', 'blouse', 'អាវ'],
    'shoes': ['shoe', 'shoes', 'sneaker', 'boot', 'sandal', 'footwear', 'ស្បែកជើង'],
    'pants': ['pant', 'pants', 'jeans', 'trousers', 'ខោ'],
    'dress': ['dress', 'gown', 'សម្លៀកបំពាក់'],
    'jacket': ['jacket', 'coat', 'hoodie', 'អាវក្រៅ'],
    'accessories': ['accessory', 'accessories', 'bag', 'hat', 'watch', 'belt'],
  };
  
  // Check for product type mentions
  for (const [type, keywords] of Object.entries(productTypes)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return type;
    }
  }
  
  // Default: return empty to search all products
  return '';
}

/**
 * Detect if user is asking specifically about their cart
 * Supports multiple languages (English, Khmer)
 */
function isAskingAboutCart(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  // English cart query patterns
  const englishPatterns = [
    /what('?s| is| do i have)? (in|is in)? (my |the )?cart/i,
    /show (me )?(my |the )?cart/i,
    /check (my |the )?cart/i,
    /view (my |the )?cart/i,
    /see (my |the )?cart/i,
    /what (did i|have i) (add|order|put)/i,
    /cart (contents|items|status)/i,
    /in my (cart|basket|order)/i,
    /how (much|many) (is |are )?in (my |the )?cart/i,
    /what'?s? (my |the )?total/i,
    /how much (do i owe|is my (order|total))/i,
    /my (current )?order/i,
  ];
  
  // Khmer cart query patterns
  const khmerPatterns = [
    /កន្ត្រក/,  // cart/basket
    /អ្វី.*?ក្នុង.*?កន្ត្រក/,  // what in cart
    /មាន.*?ក្នុង.*?កន្ត្រក/,  // have in cart
    /បញ្ជី.*?បញ្ជាទិញ/,  // order list
    /សរុប.*?ប៉ុន្មាន/,  // total how much
    /តម្លៃ.*?សរុប/,  // total price
  ];
  
  const allPatterns = [...englishPatterns, ...khmerPatterns];
  
  return allPatterns.some(pattern => pattern.test(lowerMessage) || pattern.test(message));
}

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
