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
import { validateProductTopic, isObviouslyOffTopic } from "../topic-validator";
import { generateAIResponse } from "../ai-responder";
import logger from "../../logger";
import { StageResponse } from "./types";
import { extractProductIdsFromSelection } from "./helpers";

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





