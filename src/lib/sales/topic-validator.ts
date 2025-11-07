import { appConfig } from "@/lib/config";
import logger from "@/lib/logger";

export type TopicValidation = {
  isOnTopic: boolean;
  reason?: string;
  confidence: number;
};

/**
 * Validates if a user's query is related to products/shopping
 * Returns false for off-topic questions (politics, health advice, general knowledge, etc.)
 */
export async function validateProductTopic(userMessage: string): Promise<TopicValidation> {
  try {
    const systemPrompt = `You are a topic classifier for an e-commerce sales bot.
Your job is to determine if a customer's message is related to shopping, products, or making a purchase.

ON-TOPIC examples (return true):
- "What products do you have?"
- "How much is this item?"
- "I want to buy a phone"
- "Do you have shoes in stock?"
- "What's the return policy?"
- "Can I see laptops?"
- "I need help choosing a product"

OFF-TOPIC examples (return false):
- "What's the weather today?"
- "Tell me a joke"
- "Who won the election?"
- "How do I cure a headache?"
- "What's the capital of France?"
- "Write me a poem"
- "Help me with my homework"
- "What's your opinion on politics?"

Respond with ONLY this JSON format:
{
  "isOnTopic": true/false,
  "reason": "brief explanation",
  "confidence": 0.0-1.0
}`;

    const resp = await fetch(appConfig.openai.baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appConfig.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: appConfig.openai.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `User message: "${userMessage}"\n\nIs this on-topic for a shopping/product assistant?` },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!resp.ok) {
      logger.error("Topic validation API error:", resp.statusText);
      // Default to allowing the message if validation fails
      return { isOnTopic: true, reason: "Validation service unavailable", confidence: 0.5 };
    }

    const j = await resp.json();
    const text = j?.choices?.[0]?.message?.content || "{}";

    // Extract JSON from response
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    const jsonStr = start >= 0 && end >= start ? trimmed.slice(start, end + 1) : "{}";
    const parsed = JSON.parse(jsonStr);

    const result: TopicValidation = {
      isOnTopic: parsed.isOnTopic !== false, // Default to true if unclear
      reason: parsed.reason || "",
      confidence: parsed.confidence || 0.5,
    };

    logger.info("Topic validation result:", result);
    return result;
  } catch (error) {
    logger.error("Topic validation error:", error);
    // Default to allowing the message if validation fails
    return { isOnTopic: true, reason: "Validation error", confidence: 0.5 };
  }
}

/**
 * Get a polite response for off-topic queries
 */
export function getOffTopicResponse(confidence: number): string {
  if (confidence > 0.8) {
    return "I'm a shopping assistant focused on helping you find and purchase products. I can't help with that question, but I'd be happy to:\n\n• Show you our products\n• Help you place an order\n• Answer questions about items in our catalog\n• Assist with your shopping needs\n\nWhat products are you interested in?";
  }

  return "I'm here to help you shop! I can assist with:\n\n• Finding products\n• Answering product questions\n• Placing orders\n• Checking availability\n\nWhat can I help you find today?";
}

/**
 * Quick pattern-based check for obviously off-topic queries (fast check before LLM)
 */
export function isObviouslyOffTopic(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();

  // Common off-topic patterns
  const offTopicPatterns = [
    /^(what|who|when|where|why|how) (is|are|was|were|did) (the|a) .*(president|government|election|vote|politics)/i,
    /^tell (me )?(a )?joke/i,
    /^(write|create) (me )?(a )?(poem|story|essay|song)/i,
    /(weather|temperature|forecast) (today|tomorrow)/i,
    /^(what'?s?|what is) (your|the) (meaning|purpose) of life/i,
    /^solve (this|my) (math|homework|problem)/i,
    /(medical|health|disease|symptom|cure|treatment) (advice|help|question)/i,
    /^(translate|what does) .* (mean|translate) (in|to) (spanish|french|chinese|language)/i,
    // Math questions
    /^what (is|are|'s) \d+[\+\-\*\/×÷]\d+/i,  // "what is 2+2", "what's 5*3"
    /^(calculate|compute|solve) .*(math|equation|formula)/i,
    /^\d+[\+\-\*\/×÷]\d+ (is|equals?)/i,  // "2+2 is", "5*3 equals"
    // Essay/writing requests
    /write.*(essay|article|report|paper).*(about|on)/i,
    /give me.*(essay|article|summary).*(about|on)/i,
  ];

  return offTopicPatterns.some(pattern => pattern.test(lowerMessage));
}

