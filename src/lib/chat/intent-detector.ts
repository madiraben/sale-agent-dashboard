import { appConfig } from "@/lib/config";

export interface IntentDetectionResult {
  isPurchase: boolean;
  confidence: number; // 0-1
  reason: string;
  intentType: "browsing" | "asking_questions" | "ready_to_purchase" | "providing_delivery_info" | "confirming_order";
}

/**
 * Uses LLM to detect purchase intent from message and conversation context
 * More accurate than regex-based detection
 */
export async function detectPurchaseIntentLLM(
  currentMessage: string,
  conversationContext: string
): Promise<IntentDetectionResult> {
  const prompt = `Analyze if this message indicates the customer wants to COMPLETE a purchase right now.

Recent conversation:
${conversationContext.slice(-2000)} 

Current customer message: "${currentMessage}"

A TRUE purchase intent means:
✅ Customer provides delivery information (name + address + phone)
✅ Customer explicitly confirms order ("yes", "confirm", "place order", "I'll take it")
✅ Customer says "cash on delivery" or mentions payment method
✅ Message contains structured delivery details (Name: X, Address: Y, Phone: Z)
✅ Customer says "proceed", "checkout", "buy now"

NOT a purchase intent:
❌ Just asking about products or browsing
❌ Comparing products
❌ Asking questions about shipping/delivery
❌ Saying "maybe" or "I'm interested"
❌ Providing incomplete information (only name, no address)
❌ Just viewing product details

Return ONLY this JSON format:
{
  "isPurchase": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation of your decision",
  "intentType": "browsing" | "asking_questions" | "ready_to_purchase" | "providing_delivery_info" | "confirming_order"
}

Rules:
- isPurchase = true ONLY if customer clearly wants to complete purchase NOW
- confidence = 1.0 if delivery details provided, 0.8-0.9 if explicit "buy"/"order" confirmation, 0.5-0.7 if unclear
- intentType should reflect what customer is actually doing
- Be conservative: better to ask "Ready to order?" than create unwanted order

JSON:`;

  try {
    const resp = await fetch(appConfig.openai.baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${appConfig.openai.apiKey}` },
      body: JSON.stringify({
        model: appConfig.openai.model,
        messages: [
          { role: "system", content: "You are an intent classification expert. Return only valid JSON." },
          { role: "user", content: prompt },
        ]
      }),
    });
    const j = await resp.json().catch(() => null);
    const response = j?.choices?.[0]?.message?.content ?? "";

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("⚠️  No valid JSON in intent detection response:", response);
      // Fall back to basic regex detection
      return detectPurchaseIntentFallback(currentMessage);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      isPurchase: parsed.isPurchase ?? false,
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0)),
      reason: parsed.reason || "No reason provided",
      intentType: parsed.intentType || "browsing"
    };

  } catch (error) {
    console.error("❌ Error detecting intent with LLM:", error);
    // Fall back to basic detection
    return detectPurchaseIntentFallback(currentMessage);
  }
}

/**
 * Fallback regex-based detection (simpler version of original)
 * Used when LLM detection fails
 */
export function detectPurchaseIntentFallback(message: string): IntentDetectionResult {
  const lowerMessage = message.toLowerCase();

  // Check for delivery information structure
  const hasName = /\b(?:name|customer name|full name)[:\s\-]/i.test(message);
  const hasPhone = /\b(?:phone|tel|mobile|contact)[:\s\-]/i.test(message) ||
                   /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4})/.test(message);
  const hasAddress = /\b(?:address|location|delivery|ship to|deliver to)[:\s\-]/i.test(message);

  // Check for explicit purchase keywords
  const hasPurchaseKeyword = /\b(confirm|buy|purchase|order|checkout|place order|cash on delivery|cod|i'll take|proceed)\b/i.test(message);

  // Strong signals
  const hasDeliveryStructure = (hasName && hasAddress) || (hasPhone && hasAddress);
  const hasStrongPurchaseSignal = hasPurchaseKeyword && (hasPhone || hasAddress);

  if (hasDeliveryStructure) {
    return {
      isPurchase: true,
      confidence: 0.85,
      reason: "Message contains structured delivery information",
      intentType: "providing_delivery_info"
    };
  }

  if (hasStrongPurchaseSignal) {
    return {
      isPurchase: true,
      confidence: 0.75,
      reason: "Purchase keyword with contact information",
      intentType: "confirming_order"
    };
  }

  // Weak signals
  if (hasPurchaseKeyword) {
    return {
      isPurchase: false,
      confidence: 0.5,
      reason: "Purchase keyword without delivery details",
      intentType: "ready_to_purchase"
    };
  }

  return {
    isPurchase: false,
    confidence: 0.8,
    reason: "No clear purchase intent",
    intentType: "browsing"
  };
}

/**
 * Hybrid approach: use both LLM and regex, take higher confidence result
 */
export async function detectPurchaseIntentHybrid(
  currentMessage: string,
  conversationContext: string
): Promise<IntentDetectionResult> {
  // Run both in parallel
  const [llmResult, regexResult] = await Promise.all([
    detectPurchaseIntentLLM(currentMessage, conversationContext),
    Promise.resolve(detectPurchaseIntentFallback(currentMessage))
  ]);

  // If both agree, use LLM result (more detailed)
  if (llmResult.isPurchase === regexResult.isPurchase) {
    return llmResult;
  }

  // If they disagree, use the one with higher confidence
  if (llmResult.confidence > regexResult.confidence) {
    return llmResult;
  }

  return regexResult;
}

