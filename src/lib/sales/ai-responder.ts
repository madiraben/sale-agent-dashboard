import { appConfig } from "@/lib/config";
import logger from "@/lib/logger";
import { BotSession } from "./session";
import { hasKhmerScript } from "./topic-validator";

export type ResponseContext = {
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
  systemContext?: string; // Additional context like "product added", "order created", etc.
  customPrompt?: string; // Custom bot prompt template from database
};

/**
 * Generate AI-powered contextual responses based on the conversation state
 * This replaces hardcoded template messages with dynamic, natural responses
 */
export async function generateAIResponse(context: ResponseContext): Promise<string> {
  try {
    const isKhmer = hasKhmerScript(context.userMessage);
    const language = isKhmer ? "Khmer" : "English";

    // Build system prompt based on stage
    const systemPrompt = buildSystemPrompt(context, language, context.customPrompt);

    // Build conversation context
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    // Add recent conversation history if available
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentHistory = context.conversationHistory.slice(-6); // Last 3 exchanges
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: "user", content: context.userMessage });

    const resp = await fetch(appConfig.openai.baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appConfig.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: appConfig.openai.model,
        messages,
      }),
    });

    if (!resp.ok) {
      logger.error("AI response generation failed:", resp.statusText);
      return getFallbackResponse(context, language);
    }

    const json = await resp.json();
    const reply = json?.choices?.[0]?.message?.content || "";

    if (!reply.trim()) {
      return getFallbackResponse(context, language);
    }

    logger.info("AI response generated successfully", { stage: context.stage, language });
    return reply.trim();
  } catch (error) {
    logger.error("AI response generation error:", error);
    return getFallbackResponse(context, "English");
  }
}

/**
 * Build stage-specific system prompts
 */
function buildSystemPrompt(context: ResponseContext, language: string, customPrompt?: string): string {
  // Use custom prompt if provided, otherwise use default
  const basePersonality = customPrompt || `You are a friendly, helpful e-commerce sales assistant. 
Your personality:
- Warm and conversational, not robotic
- Keep responses concise but complete
- Be enthusiastic about helping customers shop
- ALWAYS respond in ${language} language
${language === "Khmer" ? "- Use natural Khmer expressions and be culturally appropriate" : ""}

CRITICAL RULES:
- NEVER make up, invent, or hallucinate products
- ONLY show products that are explicitly provided in the context
- If no products are provided, do NOT create fake product names or prices
- You can only work with real data from the database`;

  // Add language instruction to custom prompts
  const languageInstruction = customPrompt ? `\n\nIMPORTANT: ALWAYS respond in ${language} language.${language === "Khmer" ? " Use natural Khmer expressions and be culturally appropriate." : ""}` : "";

  let stageInstructions = "";

  switch (context.stage) {
    case "discovering":
      stageInstructions = `
STAGE: Discovery/Browsing
Your role: Help customer browse products, answer questions, and start their order.

${context.systemContext ? `CONTEXT: ${context.systemContext}` : ""}

${context.cartSummary ? `Customer's current cart:\n${context.cartSummary}` : "Cart is empty"}

${context.productResults ? `REAL Products from database (ONLY show these, do NOT invent any):\n${context.productResults}` : ""}

Guidelines:
- If products were added to cart, confirm it enthusiastically and ask if they want to add more or checkout
- If showing product results, present them EXACTLY as provided - do NOT modify names, prices, or invent new products
- If answering questions, be informative and guide them toward making a purchase
- If cart has items, remind them gently that they can checkout anytime
- Be proactive in suggesting related products or next steps
- NEVER create fictional products - only reference what's explicitly provided`;
      break;

    case "confirming_products":
      stageInstructions = `
STAGE: Product Selection
Your role: Help customer select from multiple product options.

${context.productResults ? `Available products:\n${context.productResults}` : ""}

${context.systemContext ? `CONTEXT: ${context.systemContext}` : ""}

Guidelines:
- Present the product options clearly
- Ask customer to specify which product they want
- Be patient if they need more details about products
- Help them narrow down choices`;
      break;

    case "confirming_order":
      stageInstructions = `
STAGE: Order Confirmation
Your role: Confirm the customer's order before proceeding.

${context.cartSummary ? `Order summary:\n${context.cartSummary}` : ""}

${context.systemContext ? `CONTEXT: ${context.systemContext}` : ""}

Guidelines:
- Show the order summary clearly
- Ask for confirmation (yes/no)
- Let them know they can modify if needed
- Be reassuring about the order process`;
      break;

    case "collecting_contact":
      stageInstructions = `
STAGE: Collecting Contact Information
Your role: Collect customer's contact details to complete the order.

${context.contactInfo ? `Information collected so far:
${context.contactInfo.name ? `Name: ${context.contactInfo.name}` : ""}
${context.contactInfo.phone ? `Phone: ${context.contactInfo.phone}` : ""}
${context.contactInfo.email ? `Email: ${context.contactInfo.email}` : ""}
${context.contactInfo.address ? `Address: ${context.contactInfo.address}` : ""}` : "No contact info yet"}

${context.systemContext ? `CONTEXT: ${context.systemContext}` : ""}

Guidelines:
- Ask for missing information politely
- If they provided info, acknowledge it warmly
- Explain why you need their contact details (for delivery/confirmation)
- Make the process feel smooth and trustworthy
- Ask for: Name → Phone/Email → Address (in that order)`;
      break;

    default:
      stageInstructions = "Help the customer with their shopping needs.";
  }

  return `${basePersonality}${languageInstruction}

${stageInstructions}

Remember: Be natural, conversational, and helpful. Respond ONLY in ${language}.`;
}

/**
 * Fallback responses when AI generation fails
 */
function getFallbackResponse(context: ResponseContext, language: string): string {
  const isKhmer = language === "Khmer";

  switch (context.stage) {
    case "discovering":
      return isKhmer
        ? "សួស្តី! ខ្ញុំនៅទីនេះដើម្បីជួយអ្នក។ តើអ្នកចង់ធ្វើអី?"
        : "Hello! I'm here to help you. What would you like to do?";

    case "confirming_products":
      return isKhmer
        ? "សូមជ្រើសរើសផលិតផលពីបញ្ជីខាងលើ។"
        : "Please select a product from the list above.";

    case "confirming_order":
      return isKhmer
        ? "តើការបញ្ជាទិញនេះត្រឹមត្រូវទេ? ឆ្លើយ បាទ ឬ ទេ។"
        : "Is this order correct? Reply yes or no.";

    case "collecting_contact":
      return isKhmer
        ? "សូមផ្តល់ព័ត៌មានទំនាក់ទំនងរបស់អ្នក។"
        : "Please provide your contact information.";

    default:
      return isKhmer
        ? "ខ្ញុំនៅទីនេះដើម្បីជួយអ្នក!"
        : "I'm here to help!";
  }
}

