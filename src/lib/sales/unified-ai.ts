import { appConfig } from "@/lib/config";
import logger from "@/lib/logger";
import { BotSession } from "./session";
import { hasKhmerScript } from "./topic-validator";
import type { SalesIntent, ExtractedItem, ExtractedContact } from "./intent";

/**
 * UNIFIED AI RESPONSE - Single AI call for intent + response
 * This replaces the 2-call approach (extractSalesIntent + generateAIResponse)
 * 
 * Benefits:
 * - 50% faster (1 AI call instead of 2)
 * - 50% cheaper (half the tokens)
 * - Better consistency (intent and response generated together)
 */

export type UnifiedContext = {
  stage: BotSession["stage"];
  userMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  cartSummary?: string;
  productResults?: string;
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  systemContext?: string;
  customPrompt?: string;
};

export type UnifiedAIResult = {
  intent: SalesIntent["intent"];
  items?: ExtractedItem[];
  contact?: ExtractedContact;
  confidence: number;
  reply: string;
};

/**
 * Single AI call that returns BOTH intent classification AND natural language response
 */
export async function getUnifiedAIResponse(context: UnifiedContext): Promise<UnifiedAIResult> {
  try {
    const isKhmer = hasKhmerScript(context.userMessage);
    const language = isKhmer ? "Khmer" : "English";

    // Build unified system prompt
    const systemPrompt = buildUnifiedSystemPrompt(context, language);

    // Build messages
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentHistory = context.conversationHistory.slice(-6);
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: "user", content: context.userMessage });

    logger.info("🚀 Making unified AI call (intent + response in 1 call)");
    const startTime = Date.now();

    const resp = await fetch(appConfig.openai.baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appConfig.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: appConfig.openai.model,
        messages,
        temperature: 0.3, // Lower for more structured/consistent JSON output
        max_tokens: 600,
        response_format: { type: "json_object" }, // Force JSON mode
      }),
    });

    const latency = Date.now() - startTime;
    logger.info(`✅ Unified AI call completed in ${latency}ms`);

    if (!resp.ok) {
      logger.error("Unified AI call failed:", resp.statusText);
      return getFallbackUnifiedResponse(context, language);
    }

    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content || "";

    if (!content.trim()) {
      logger.error("Empty response from unified AI call");
      return getFallbackUnifiedResponse(context, language);
    }

    // Log the raw AI response for debugging
    logger.info("Raw AI response:", content.substring(0, 500));

    // Parse the structured response
    const result = parseUnifiedResponse(content, language);
    
    logger.info("Unified AI result:", {
      intent: result.intent,
      confidence: result.confidence,
      hasItems: !!result.items?.length,
      hasContact: !!result.contact,
      replyLength: result.reply.length,
    });

    return result;
  } catch (error) {
    logger.error("Unified AI call error:", error);
    return getFallbackUnifiedResponse(context, "English");
  }
}

/**
 * Build unified system prompt that asks for BOTH intent AND response
 */
function buildUnifiedSystemPrompt(context: UnifiedContext, language: string): string {
  const basePersonality = context.customPrompt || `You are a friendly, helpful e-commerce sales assistant.`;

  const stageContext = buildStageContext(context, language);

  return `${basePersonality}

${stageContext}

CRITICAL INSTRUCTION - YOU MUST RESPOND WITH JSON ONLY:

You MUST respond with ONLY a JSON object. Do NOT include any other text before or after the JSON.
Do NOT wrap the JSON in markdown code blocks.
Do NOT add explanations or comments.

Return this exact structure:

{
  "intent": "order" | "add_to_cart" | "modify_cart" | "confirm_order" | "provide_contact" | "query" | "cancel" | "unknown",
  "items": [{"name": "product name", "qty": 1}],
  "contact": {"name": "...", "email": "...", "phone": "...", "address": "..."},
  "confidence": 0.0 to 1.0,
  "reply": "Your natural language response to the customer in ${language}"
}

INTENT CLASSIFICATION (works for ANY language):
- "order": User wants to start ordering (English: "I want to buy", Khmer: "ចង់ទិញ")
- "add_to_cart": User wants to add items (English: "add 2 shirts", Khmer: "បន្ថែម", "យក")
- "modify_cart": User wants to change/remove items (English: "remove shoes", Khmer: "ដកចេញ", "ផ្លាស់ប្តូរ")
- "confirm_order": User confirms order (English: "yes", "confirm", Khmer: "បាទ/ចាស", "យល់ព្រម")
- "provide_contact": User provides contact info (name, phone, email, address)
- "query": User asking questions (English: "what's the price", Khmer: "តម្លៃប៉ុន្មាន")
- "cancel": User wants to cancel (English: "no", "cancel", Khmer: "ទេ", "លុបចោល")
- "unknown": Cannot determine intent

RULES:
- Extract items only if explicitly mentioned or if user says "yes/ok" to a product recommendation
- Extract contact only if explicitly provided (name, phone, email, address)
- When user provides contact like "John, john@email.com, 123456, Address", extract ALL fields
- Confidence: 0.8-1.0 = clear, 0.5-0.8 = likely, 0.0-0.5 = unclear
- Reply field MUST be in ${language} language
- NEVER hallucinate products - only reference products explicitly provided in context
- Keep reply concise but complete (2-4 sentences)

CRITICAL: Respond with ONLY valid JSON. Nothing else. No explanations.`;
}

/**
 * Build stage-specific context
 */
function buildStageContext(context: UnifiedContext, language: string): string {
  let stageInfo = "";

  switch (context.stage) {
    case "discovering":
      stageInfo = `STAGE: Discovery/Browsing
${context.systemContext ? `Context: ${context.systemContext}\n` : ""}
${context.cartSummary ? `Cart:\n${context.cartSummary}\n` : "Cart: empty\n"}
${context.productResults ? `Available products (ONLY show these, do NOT invent):\n${context.productResults}\n` : ""}
Your role: Help browse, answer questions, add items to cart.`;
      break;

    case "confirming_products":
      stageInfo = `STAGE: Product Selection
${context.productResults ? `Products:\n${context.productResults}\n` : ""}
${context.systemContext ? `Context: ${context.systemContext}\n` : ""}
Your role: Help customer choose from multiple product options.`;
      break;

    case "confirming_order":
      stageInfo = `STAGE: Order Confirmation (NOT YET PLACED!)
${context.cartSummary ? `Order:\n${context.cartSummary}\n` : ""}
${context.systemContext ? `Context: ${context.systemContext}\n` : ""}
CRITICAL: The order is NOT confirmed yet! You must:
1. Show the cart summary
2. Ask "Is this correct? Would you like to proceed?"
3. DO NOT say "order confirmed" or "thank you for purchase" - that comes AFTER payment!
4. Wait for user to say yes/confirm before proceeding to collect contact info.`;
      break;

    case "collecting_contact":
      stageInfo = `STAGE: Collecting Contact Information
${context.contactInfo ? `Info so far:
${context.contactInfo.name ? `Name: ${context.contactInfo.name}\n` : "Missing: Name\n"}
${context.contactInfo.phone ? `Phone: ${context.contactInfo.phone}\n` : ""}
${context.contactInfo.email ? `Email: ${context.contactInfo.email}\n` : ""}
${!context.contactInfo.phone && !context.contactInfo.email ? `Missing: Phone or Email\n` : ""}
${context.contactInfo.address ? `Address: ${context.contactInfo.address}\n` : "Missing: Address\n"}` : "No info collected yet\n"}
${context.systemContext ? `Context: ${context.systemContext}\n` : ""}
REQUIRED INFO: Name, Phone OR Email, Address
Your role: Ask for missing information politely. Once all required info is collected, the system will automatically create the order.`;
      break;

    default:
      stageInfo = "Help customer with shopping needs.";
  }

  return stageInfo;
}

/**
 * Parse the AI's structured response
 */
function parseUnifiedResponse(content: string, language: string): UnifiedAIResult {
  try {
    // Clean the content - remove markdown code blocks if present
    let cleanedContent = content.trim();
    
    // Remove markdown json blocks
    const jsonBlockMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      cleanedContent = jsonBlockMatch[1].trim();
    } else {
      // Remove any backticks
      cleanedContent = cleanedContent.replace(/```/g, '').trim();
    }
    
    // Try to find JSON object
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      logger.warn("No JSON found in unified response, extracting reply only");
      logger.warn("Content was:", cleanedContent.substring(0, 200));
      return {
        intent: "unknown",
        confidence: 0.3,
        reply: cleanedContent || (language === "Khmer" ? "ខ្ញុំមិនយល់ច្បាស់។" : "I'm not sure what you mean."),
      };
    }

    const jsonStr = jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    return {
      intent: parsed.intent || "unknown",
      items: Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : undefined,
      contact: parsed.contact || undefined,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      reply: parsed.reply?.trim() || (language === "Khmer" ? "អរគុណ!" : "Thank you!"),
    };
  } catch (error) {
    logger.error("Failed to parse unified response:", error);
    logger.error("Content was:", content);
    
    // Fallback: use the entire content as reply
    return {
      intent: "unknown",
      confidence: 0.3,
      reply: content.trim() || (language === "Khmer" ? "មានបញ្ហា។" : "Something went wrong."),
    };
  }
}

/**
 * Fallback when AI call fails
 */
function getFallbackUnifiedResponse(context: UnifiedContext, language: string): UnifiedAIResult {
  const isKhmer = language === "Khmer";

  let fallbackReply = "";
  switch (context.stage) {
    case "discovering":
      fallbackReply = isKhmer
        ? "សួស្តី! ខ្ញុំនៅទីនេះដើម្បីជួយអ្នក។ តើអ្នកចង់ធ្វើអី?"
        : "Hello! I'm here to help you. What would you like to do?";
      break;
    case "confirming_products":
      fallbackReply = isKhmer
        ? "សូមជ្រើសរើសផលិតផលពីបញ្ជីខាងលើ។"
        : "Please select a product from the list above.";
      break;
    case "confirming_order":
      fallbackReply = isKhmer
        ? "តើការបញ្ជាទិញនេះត្រឹមត្រូវទេ? ឆ្លើយ បាទ ឬ ទេ។"
        : "Is this order correct? Reply yes or no.";
      break;
    case "collecting_contact":
      fallbackReply = isKhmer
        ? "សូមផ្តល់ព័ត៌មានទំនាក់ទំនងរបស់អ្នក។"
        : "Please provide your contact information.";
      break;
    default:
      fallbackReply = isKhmer ? "ខ្ញុំនៅទីនេះដើម្បីជួយអ្នក!" : "I'm here to help!";
  }

  return {
    intent: "unknown",
    confidence: 0.0,
    reply: fallbackReply,
  };
}

