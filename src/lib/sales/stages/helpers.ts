import { CartItem } from "../session";

/**
 * Detect what cart modification the user wants to make
 */
export function detectCartModification(
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
export function isAskingToBrowseProducts(message: string): boolean {
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
export function extractProductTypeFromQuery(message: string): string {
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
export function isAskingAboutCart(message: string): boolean {
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

export function extractProductIdsFromSelection(
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




