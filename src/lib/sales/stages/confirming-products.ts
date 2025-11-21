import { extractSalesIntent, SalesIntent } from "../intent";
import { 
  BotSession, 
  addToCart, 
  getRecentConversation,
} from "../session";
import { 
  searchProducts, 
  getProductsByIds,
  getCartProducts,
  formatCartDisplay,
  formatPendingProducts,
  Product 
} from "../product-search";
import { validateProductTopic, isObviouslyOffTopic, getOffTopicResponse } from "../topic-validator";
import { generateAIResponse } from "../ai-responder";
import { getUnifiedAIResponse } from "../unified-ai";
import logger from "../../logger";
import { StageResponse } from "./types";
import { extractProductIdsFromSelection } from "./helpers";
import {
  initializeStageContext,
  handleOffTopicCheck,
  handleCancelIntent,
} from "./common-handlers";


export async function handleConfirmingProductsStage(
  tenantIds: string[],
  session: BotSession,
  userText: string
): Promise<StageResponse> {
  const { conversationContext, useUnifiedAI } = initializeStageContext(session);
  
  if (useUnifiedAI) {
    return await handleConfirmingProductsStageUnified(tenantIds, session, userText, conversationContext);
  }

  // Legacy approach below
  // Check if message is off-topic using common handler
  const productResults = session.pending_products ? formatPendingProducts(session.pending_products) : "";
  const offTopicResult = await handleOffTopicCheck(
    userText,
    "confirming_products",
    conversationContext,
    { productResults }
  );
  if (offTopicResult) {
    return offTopicResult;
  }

  const extracted: SalesIntent = await extractSalesIntent(userText, conversationContext, "confirming_products");

  // Handle cancel
  if (extracted.intent === "cancel") {
    return await handleCancelIntent(userText, conversationContext);
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
      const results = await searchProducts(tenantIds, item.name, conversationContext.join('\n'));
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
  const fallbackProductResults = formatPendingProducts(session.pending_products);
  const reply = await generateAIResponse({
    stage: "confirming_products",
    userMessage: userText,
    conversationHistory: conversationContext,
    productResults: fallbackProductResults,
    systemContext: "Show the product options again and ask customer to tell you which one they want by name.",
  });

  return {
    reply,
    newStage: "confirming_products",
  };
}

async function handleConfirmingProductsStageUnified(
  tenantIds: string[],
  session: BotSession,
  userText: string,
  conversationContext: Array<{ role: "user" | "assistant"; content: string }>
): Promise<StageResponse> {
  logger.info("🚀 Using unified AI approach for confirming_products stage");

  // Check for off-topic using common handler
  const offTopicResult = await handleOffTopicCheck(userText, "confirming_products", conversationContext);
  if (offTopicResult) {
    return offTopicResult;
  }

  // Check if we have pending products
  if (!session.pending_products || session.pending_products.length === 0) {
    const result = await getUnifiedAIResponse({
      stage: "discovering",
      userMessage: userText,
      conversationHistory: conversationContext,
      systemContext: "No pending products. Ask what they'd like to order.",
    });
    return {
      reply: result.reply,
      newStage: "discovering",
      updatedPendingProducts: undefined,
    };
  }

  // Make unified AI call
  const productResults = formatPendingProducts(session.pending_products);
  const result = await getUnifiedAIResponse({
    stage: "confirming_products",
    userMessage: userText,
    conversationHistory: conversationContext,
    productResults,
  });

  logger.info("Unified result:", { intent: result.intent, confidence: result.confidence });

  // Handle cancel
  if (result.intent === "cancel") {
    return await handleCancelIntent(userText, conversationContext);
  }

  // Try to extract product selection
  const productIds = extractProductIdsFromSelection(userText, session.pending_products);
  
  if (productIds.length > 0) {
    const products = await getProductsByIds(tenantIds, productIds);
    let updatedCart = session.cart;
    
    for (const product of products) {
      updatedCart = addToCart(updatedCart, {
        product_id: product.id,
        name: product.name,
        qty: 1,
        price: product.price,
      });
    }
    
    return {
      reply: result.reply,
      newStage: "discovering",
      updatedCart,
      updatedPendingProducts: undefined,
    };
  }

  // Check if AI extracted new items (customer refined their search)
  if (result.items && result.items.length > 0) {
    const newSearches: Array<{ query: string; results: Product[] }> = [];
    
    for (const item of result.items) {
      const results = await searchProducts(tenantIds, item.name, conversationContext.join('\n'));
      if (results.length > 0) {
        newSearches.push({ query: item.name, results });
      }
    }

    if (newSearches.length === 0) {
      // No products found
      return { reply: result.reply, newStage: "confirming_products" };
    }

    // Check if we have clear matches now
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
      
      return {
        reply: result.reply,
        newStage: "discovering",
        updatedCart,
        updatedPendingProducts: undefined,
      };
    }

    // Still multiple matches
    return {
      reply: result.reply,
      newStage: "confirming_products",
      updatedPendingProducts: newSearches,
    };
  }

  // Default: stay in stage and show options again
  return {
    reply: result.reply,
    newStage: "confirming_products",
  };
}




