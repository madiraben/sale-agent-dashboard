import { extractSalesIntent, SalesIntent } from "../intent";
import { runRagForUserTenants } from "@/lib/rag/engine";
import { 
  BotSession, 
  addToCart, 
  clearCart, 
  isCartEmpty,
  removeFromCart,
  updateCartItemQty,
  getRecentConversation,
} from "../session";
import { 
  searchProducts, 
  getCartProducts,
  formatCartDisplay,
  Product 
} from "../product-search";
import { validateProductTopic, getOffTopicResponse, isObviouslyOffTopic } from "../topic-validator";
import { generateAIResponse } from "../ai-responder";
import logger from "../../logger";
import { StageResponse } from "./types";
import { 
  detectCartModification, 
  isAskingToBrowseProducts, 
  extractProductTypeFromQuery, 
  isAskingAboutCart 
} from "./helpers";

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
    logger.info("AI reply:", reply);

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
      const reply = getOffTopicResponse(1.0, userText);
      logger.info("AI reply:", reply);
      return {
        reply,
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
      const reply = getOffTopicResponse(topicValidation.confidence, userText);
      logger.info("AI reply:", reply);
      return {
        reply,
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
        logger.info("AI reply:", reply);
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
      logger.info("AI reply:", reply);
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
        logger.info("AI reply:", reply);
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
      logger.info("AI reply:", reply);
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
      logger.info("AI reply:", reply);
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
    logger.info("AI reply:", reply);
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
      logger.info("AI reply:", reply);
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
      logger.info("AI reply:", reply);
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
      logger.info("AI reply:", reply);
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
      logger.info("AI reply:", reply);
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
    logger.info("AI reply:", reply);
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
        logger.info("AI reply:", reply);

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
      logger.info("AI reply:", reply);

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

      logger.info("AI reply:", reply);
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
    logger.info("AI reply:", reply);
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
      logger.info("AI reply:", reply);

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
    logger.info("AI reply:", reply);

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
  logger.info("AI reply:", reply);

  return {
    reply,
    newStage: "discovering",
  };
}

