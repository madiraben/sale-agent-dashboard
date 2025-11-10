import { appConfig } from "@/lib/config";

// Simple LLM completion without RAG context
async function complete(systemPrompt: string, userPrompt: string): Promise<string> {
  const resp = await fetch(appConfig.openai.baseUrl + "/chat/completions", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      Authorization: `Bearer ${appConfig.openai.apiKey}` 
    },
    body: JSON.stringify({
      model: appConfig.openai.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });
  
  const j = await resp.json().catch(() => null);
  return j?.choices?.[0]?.message?.content || "{}";
}

// Type definitions
export interface CustomerInfo {
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
}

export interface OrderProduct {
  product_id: string;
  name: string;
  price: number;
  qty: number;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-1
  issues: string[];
  corrections?: Partial<CustomerInfo>;
  suggestedQuestions?: string[];
}

export interface ProductValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  validatedProducts: OrderProduct[];
  invalidProducts: Array<{ name: string; reason: string }>;
}

/**
 * Validates customer information extracted from message
 * Uses LLM to check if data makes sense and is complete
 */
export async function validateCustomerInfo(
  extractedInfo: CustomerInfo,
  originalMessage: string
): Promise<ValidationResult> {
  const prompt = `Validate this customer information extracted from a purchase message.

Original message: "${originalMessage}"

Extracted data:
- Name: ${extractedInfo.name || "NOT FOUND"}
- Phone: ${extractedInfo.phone || "NOT FOUND"}  
- Address: ${extractedInfo.address || "NOT FOUND"}
- Email: ${extractedInfo.email || "NOT FOUND"}

Validation checks:
1. Is the name actually a person's name (not a product/random text)? Single names like "john" or "messi" are OK!
2. Is the phone number in a valid format (any international format)? Numbers like "012345678" are valid.
3. Is the address reasonable? City names are OK (e.g., "phnom penh", "new york"). We can accept incomplete addresses.
4. If email provided, is it valid format?
5. Is there enough information to contact customer and deliver?

Return ONLY a JSON object in this exact format:
{
  "isValid": true or false,
  "confidence": 0.0 to 1.0 (how confident you are),
  "issues": ["ONLY list CRITICAL missing information"],
  "corrections": {"field": "corrected value if you can infer it"},
  "suggestedQuestions": ["SPECIFIC questions for MISSING fields only"]
}

IMPORTANT RULES:
- isValid = true if we have: (name OR phone) AND some address/location
- Single names like "messi", "john" are VALID names for casual orders
- City-only addresses like "phnom penh" are OK - we can ask for details later
- confidence = 0.8+ if we have name, phone, and any location
- confidence = 0.6-0.8 if address is just a city (but still valid)
- confidence = < 0.6 only if critical info is MISSING
- Be LENIENT - better to accept and confirm than reject
- If all three fields (name, phone, address) are provided, isValid should be TRUE

JSON:`;

  try {
    const response = await complete(
      "You are a data validation expert. Return only valid JSON.",
      prompt
    );

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("⚠️  No valid JSON in validation response:", response);
      return {
        isValid: false,
        confidence: 0.3,
        issues: ["Could not validate - extraction unclear"],
        suggestedQuestions: ["Could you please provide your name, phone number, and delivery address?"]
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Ensure all required fields exist
    return {
      isValid: parsed.isValid ?? false,
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0)),
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      corrections: parsed.corrections,
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : []
    };

  } catch (error) {
    console.error("❌ Error validating customer info:", error);
    return {
      isValid: false,
      confidence: 0,
      issues: ["Validation error occurred"],
      suggestedQuestions: ["Could you please provide your delivery information again?"]
    };
  }
}

/**
 * Validates extracted order products against conversation and available catalog
 */
export async function validateOrderProducts(
  extractedProducts: OrderProduct[],
  conversationSummary: string,
  availableProducts: Array<{ id: string; name: string; price: number }>
): Promise<ProductValidationResult> {
  if (extractedProducts.length === 0) {
    return {
      isValid: false,
      confidence: 0,
      issues: ["No products were extracted from the conversation"],
      validatedProducts: [],
      invalidProducts: []
    };
  }

  const prompt = `Validate these extracted order products against the conversation.

Conversation summary:
${conversationSummary}

Extracted products (from LLM):
${JSON.stringify(extractedProducts, null, 2)}

Available products in catalog:
${JSON.stringify(availableProducts.slice(0, 50), null, 2)}

Validation checks:
1. Did the customer actually CONFIRM ordering each product?
2. Are the quantities mentioned and reasonable?
3. Do the product names match the catalog (allowing for minor variations)?
4. Are the prices approximately correct compared to catalog?
5. Did customer explicitly say "yes", "I'll take it", "order", etc. for these products?

Return ONLY a JSON object:
{
  "isValid": true or false,
  "confidence": 0.0 to 1.0,
  "issues": ["list of problems"],
  "validatedProducts": [
    {"name": "exact catalog name", "catalogId": "id from catalog", "price": catalog_price, "qty": confirmed_qty}
  ],
  "invalidProducts": [
    {"name": "product name", "reason": "why it's invalid"}
  ]
}

Rules:
- Only mark isValid=true if you're confident customer confirmed these specific products
- Match product names to catalog (handle typos, variations like "tshirt" vs "t-shirt")
- If no products confirmed for order, isValid=false
- Be conservative - better to ask for confirmation than create wrong order

JSON:`;

  try {
    const response = await complete(
      "You are an order validation expert. Return only valid JSON.",
      prompt
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("⚠️  No valid JSON in product validation response");
      return {
        isValid: false,
        confidence: 0,
        issues: ["Could not validate products"],
        validatedProducts: [],
        invalidProducts: extractedProducts.map(p => ({ name: p.name, reason: "Validation failed" }))
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Map validated products back to OrderProduct format
    const validatedProducts: OrderProduct[] = (parsed.validatedProducts || []).map((p: any) => ({
      product_id: p.catalogId || '',
      name: p.name,
      price: p.price || 0,
      qty: p.qty || 1
    }));

    return {
      isValid: parsed.isValid ?? false,
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0)),
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      validatedProducts,
      invalidProducts: Array.isArray(parsed.invalidProducts) ? parsed.invalidProducts : []
    };

  } catch (error) {
    console.error("❌ Error validating products:", error);
    return {
      isValid: false,
      confidence: 0,
      issues: ["Product validation error occurred"],
      validatedProducts: [],
      invalidProducts: extractedProducts.map(p => ({ name: p.name, reason: "Validation error" }))
    };
  }
}

/**
 * Generates a friendly clarification message based on validation issues
 */
export function generateClarificationMessage(
  customerIssues: string[],
  productIssues: string[],
  suggestedQuestions: string[]
): string {
  const allIssues = [...customerIssues, ...productIssues];
  
  if (allIssues.length === 0) {
    return "I want to make sure I have your order details correct. Could you confirm?";
  }

  // Check what information we actually need
  const needsName = customerIssues.some(i => i.toLowerCase().includes("name"));
  const needsPhone = customerIssues.some(i => i.toLowerCase().includes("phone"));
  const needsAddress = customerIssues.some(i => i.toLowerCase().includes("address") || i.toLowerCase().includes("street"));
  const needsProducts = productIssues.length > 0;

  // Build a specific message only for what's missing
  const parts: string[] = [];
  const missingFields: string[] = [];

  if (needsName) missingFields.push("your full name");
  if (needsPhone) missingFields.push("your phone number");
  if (needsAddress) missingFields.push("your complete street address (with street name and building number)");

  if (missingFields.length > 0) {
    if (missingFields.length === 1) {
      parts.push(`I need ${missingFields[0]} to complete your order.`);
    } else if (missingFields.length === 2) {
      parts.push(`I need ${missingFields[0]} and ${missingFields[1]} to complete your order.`);
    } else {
      const last = missingFields.pop();
      parts.push(`I need ${missingFields.join(", ")}, and ${last} to complete your order.`);
    }
  }

  if (needsProducts) {
    parts.push("Could you also confirm which products you'd like to order and the quantities?");
  }

  // Use suggested questions if available and specific
  if (suggestedQuestions.length > 0 && suggestedQuestions[0].length < 150) {
    return suggestedQuestions[0];
  }

  return parts.join(" ") || "Please provide your delivery details so I can process your order.";
}

/**
 * Calculates overall confidence score for an order
 */
export function calculateOrderConfidence(
  customerConfidence: number,
  productConfidence: number,
  productCount: number
): number {
  // Weight customer info higher (60%) than products (40%)
  // Also penalize orders with no products
  if (productCount === 0) return 0;
  
  const weighted = (customerConfidence * 0.6) + (productConfidence * 0.4);
  
  // Slightly reduce confidence if only 1 product (might be mistake)
  // This is a heuristic - adjust based on your business
  const countFactor = productCount === 1 ? 0.95 : 1.0;
  
  return Math.max(0, Math.min(1, weighted * countFactor));
}

