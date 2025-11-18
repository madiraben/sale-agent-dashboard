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
The customer can write in ANY language (English, Khmer, etc.).

ON-TOPIC examples (return true):
English:
- "What products do you have?"
- "How much is this item?"
- "I want to buy a phone"
- "Do you have shoes in stock?"
- "What's the return policy?"
- "Can I see laptops?"
- "I need help choosing a product"

Khmer (ភាសាខ្មែរ):
- "មានផលិតផលអ្វីខ្លះ?"
- "តម្លៃប៉ុន្មាន?"
- "ចង់ទិញទូរស័ព្ទ"
- "មានស្បែកជើងអត់?"
- "អាចមើលកុំព្យូទ័របានទេ?"
- "ខ្ញុំចង់បញ្ជាទិញ"

OFF-TOPIC examples (return false):
English:
- "What's the weather today?"
- "Tell me a joke"
- "Who won the election?"
- "How do I cure a headache?"
- "What's the capital of France?"
- "Write me a poem"
- "Help me with my homework"
- "What's your opinion on politics?"

Khmer (ភាសាខ្មែរ):
- "អាកាសធាតុថ្ងៃនេះយ៉ាងម៉េច?"
- "និយាយរឿងកំប្លែង"
- "រដ្ឋធានីបារាំងឈ្មោះអី?"

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
        ]
      }),
    });

    if (!resp.ok) {
      logger.error("Topic validation API error:", resp.statusText);
      // Default to allowing the message if validation fails
      return { isOnTopic: true, reason: "Validation service unavailable", confidence: 0.5 };
    }

    const j = await resp.json();
    const text = j?.choices?.[0]?.message?.content || "{}";

    // Extract JSON from response with robust error handling
    let parsed: any = {};
    try {
      const trimmed = text.trim();
      const start = trimmed.indexOf("{");
      const end = trimmed.lastIndexOf("}");
      const jsonStr = start >= 0 && end >= start ? trimmed.slice(start, end + 1) : "{}";
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error("Failed to parse topic validation JSON:", parseError, "Raw text:", text);
      // Return default safe values on parse error
      return { isOnTopic: true, reason: "JSON parse error", confidence: 0.5 };
    }

    const result: TopicValidation = {
      isOnTopic: parsed.isOnTopic !== false, // Default to true if unclear
      reason: parsed.reason || "",
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
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
 * Detect if message contains Khmer script
 * Exported for use in other modules
 */
export function hasKhmerScript(text: string): boolean {
  // Khmer Unicode range: U+1780 to U+17FF
  return /[\u1780-\u17FF]/.test(text);
}

/**
 * Get a polite response for off-topic queries
 * Returns response in the same language as the query
 */
export function getOffTopicResponse(confidence: number, originalMessage?: string): string {
  const isKhmer = originalMessage && hasKhmerScript(originalMessage);
  
  if (isKhmer) {
    // Khmer responses
    if (confidence > 0.8) {
      return "ខ្ញុំជាជំនួយការទិញទំនិញ ផ្តោតលើការជួយអ្នកស្វែងរក និងទិញផលិតផល។ ខ្ញុំមិនអាចជួយសំណួរនេះបានទេ ប៉ុន្តែខ្ញុំរីករាយក្នុងការ:\n\n• បង្ហាញផលិតផលរបស់យើង\n• ជួយអ្នកធ្វើការបញ្ជាទិញ\n• ឆ្លើយសំណួរអំពីផលិតផល\n• ជួយអ្នកក្នុងការទិញទំនិញ\n\nតើអ្នកចាប់អារម្មណ៍ផលិតផលអ្វី?";
    }
    return "ខ្ញុំនៅទីនេះដើម្បីជួយអ្នកទិញទំនិញ! ខ្ញុំអាចជួយ:\n\n• ស្វែងរកផលិតផល\n• ឆ្លើយសំណួរអំពីផលិតផល\n• ធ្វើការបញ្ជាទិញ\n• ពិនិត្យភាពអាចរកបាន\n\nតើខ្ញុំអាចជួយអ្នករកអ្វីថ្ងៃនេះ?";
  }
  
  // English responses
  if (confidence > 0.8) {
    return "I'm a shopping assistant focused on helping you find and purchase products. I can't help with that question, but I'd be happy to:\n\n• Show you our products\n• Help you place an order\n• Answer questions about items in our catalog\n• Assist with your shopping needs\n\nWhat products are you interested in?";
  }

  return "I'm here to help you shop! I can assist with:\n\n• Finding products\n• Answering product questions\n• Placing orders\n• Checking availability\n\nWhat can I help you find today?";
}

/**
 * Quick pattern-based check for obviously off-topic queries (fast check before LLM)
 * Note: Greetings and basic conversational phrases are NOT considered off-topic
 * as they're normal parts of customer service conversations
 */
export function isObviouslyOffTopic(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();

  // === ENGLISH OFF-TOPIC PATTERNS ===
  
  // Politics & Current Events
  const politicsPatterns = [
    /^(what|who|when|where|why|how) (is|are|was|were|did) (the|a) .*(president|government|election|vote|politics|minister|parliament)/i,
    /(democrat|republican|liberal|conservative|party) (win|won|lose|lost)/i,
  ];

  // Entertainment & Creative Requests
  const entertainmentPatterns = [
    /^tell (me )?(a )?joke/i,
    /^(write|create|compose) (me )?(a )?(poem|story|essay|song|novel|script)/i,
    /write.*(essay|article|report|paper|thesis).*(about|on|for)/i,
    /give me.*(essay|article|summary|report).*(about|on)/i,
  ];

  // General Knowledge & Trivia (not product-related)
  const triviaPatterns = [
    /(weather|temperature|forecast|rain|sunny) (today|tomorrow|this week)/i,
    /^(what'?s?|what is) (your|the) (meaning|purpose) of life/i,
    /^(what|who|where)'?s? (the )?(capital|president|population) of/i,
    /^who (invented|discovered|created) (the )?(?!product|item)/i,
  ];

  // Academic & Homework Help
  const academicPatterns = [
    /^solve (this|my|the) (math|homework|problem|equation)/i,
    /help (me )?(with )?(my )?(homework|assignment|test|exam)/i,
    /^(calculate|compute) .*(math|equation|formula|problem)/i,
  ];

  // Math Questions (direct calculations)
  const mathPatterns = [
    /^what (is|are|'s) \d+[\+\-\*\/×÷]\d+/i,  // "what is 2+2", "what's 5*3"
    /^\d+[\+\-\*\/×÷]\d+ (is|equals?|=)/i,  // "2+2 is", "5*3 equals"
    /^(how much is) \d+[\+\-\*\/×÷]\d+/i,
  ];

  // Medical & Health Advice
  const medicalPatterns = [
    /(medical|health|disease|symptom|cure|treatment|diagnosis|doctor) (advice|help|question|recommendation)/i,
    /^(how (do|can) (i|you)|what (should|can) i) (cure|treat|heal|fix) (a |my )?(headache|cold|fever|pain|disease)/i,
    /^(am i|is this|could this be) (sick|ill|infected|contagious)/i,
  ];

  // Translation Requests (not product descriptions)
  const translationPatterns = [
    /^(translate|what does) .* (mean|translate) (in|to) (spanish|french|german|chinese|japanese|korean|language)/i,
    /^how do you say .* in (spanish|french|german|chinese|japanese|korean)/i,
  ];

  // Technical Support (non-product)
  const techSupportPatterns = [
    /(fix|repair|troubleshoot) (my )?(computer|laptop|phone|device|software)(?! (purchase|order|price|buy))/i,
    /why (is|does) my (computer|phone|device) (slow|broken|not working)/i,
  ];

  // === KHMER OFF-TOPIC PATTERNS ===
  
  const khmerPatterns = [
    // Weather: "អាកាសធាតុថ្ងៃនេះយ៉ាងម៉េច?" (What's the weather today?)
    /អាកាសធាតុ.*?(ថ្ងៃនេះ|ថ្ងៃស្អែក)/,
    // Jokes: "និយាយរឿងកំប្លែង" (Tell a joke)
    /និយាយ.*?រឿងកំប្លែង/,
    /ប្រាប់.*?រឿងកំប្លែង/,
    // General knowledge: "រដ្ឋធានីបារាំងឈ្មោះអី?" (What's the capital of France?)
    /រដ្ឋធានី.*?ឈ្មោះអី/,
    // Politics: "នយោបាយ", "រដ្ឋាភិបាល", "បោះឆ្នោត"
    /(នយោបាយ|រដ្ឋាភិបាល|បោះឆ្នោត|គណបក្ស)/,
    // Medical: "ជំងឺ", "ពេទ្យ", "ថ្នាំ" (when asking for medical advice, not product)
    /(ព្យាបាល|ជំងឺ)(?!.*?(ផលិតផល|ទិញ|តម្លៃ))/,
    // Homework: "កិច្ចការផ្ទះ", "មេរៀន"
    /(កិច្ចការផ្ទះ|ជួយធ្វើ.*?មេរៀន)/,
  ];

  // Combine all patterns
  const allPatterns = [
    ...politicsPatterns,
    ...entertainmentPatterns,
    ...triviaPatterns,
    ...academicPatterns,
    ...mathPatterns,
    ...medicalPatterns,
    ...translationPatterns,
    ...techSupportPatterns,
    ...khmerPatterns,
  ];

  return allPatterns.some(pattern => pattern.test(lowerMessage) || pattern.test(message));
}

