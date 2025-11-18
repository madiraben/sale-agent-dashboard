import { appConfig } from "@/lib/config";

export type ExtractedItem = { name: string; qty?: number };
export type ExtractedContact = { name?: string; email?: string; phone?: string; address?: string };
export type SalesIntent = {
  intent: "order" | "add_to_cart" | "modify_cart" | "confirm_order" | "provide_contact" | "query" | "cancel" | "unknown";
  items?: ExtractedItem[];
  contact?: ExtractedContact;
  confidence?: number;
};

const SYSTEM = `You are an expert sales conversation analyst. Analyze the user's message in context of the conversation.

LANGUAGE SUPPORT:
- The user can write in ANY language (English, Khmer, etc.)
- Understand intents regardless of language
- Extract product names and contact info in their original language

Extract STRICT JSON only with this shape:
{
  "intent": "order" | "add_to_cart" | "modify_cart" | "confirm_order" | "provide_contact" | "query" | "cancel" | "unknown",
  "items": [{"name": string, "qty": number}],
  "contact": {"name": string, "email": string, "phone": string, "address": string},
  "confidence": number (0-1)
}

Intent Classification (works for ANY language):
- "order": User wants to start ordering
  * English: "I want to buy", "I'd like to order"
  * Khmer: "ចង់ទិញ", "ខ្ញុំចង់បញ្ជាទិញ", "យកមួយ"
  
- "add_to_cart": User wants to add specific items
  * English: "add 2 shirts", "I want a phone"
  * Khmer: "បន្ថែម", "យក", "ចង់បាន"
  
- "modify_cart": User wants to change quantities or remove items
  * English: "change to 3", "remove the shoes"
  * Khmer: "ផ្លាស់ប្តូរ", "ដកចេញ", "លុបចោល"
  
- "confirm_order": User confirms the order
  * English: "yes", "confirm", "that's correct"
  * Khmer: "បាទ/ចាស", "យល់ព្រម", "ត្រូវហើយ", "okie"
  
- "provide_contact": User is providing contact information
  * English: "my name is John", "call me at 123-456"
  * Khmer: "ឈ្មោះ", "លេខទូរសព្ទ", "អាស័យដ្ឋាន"
  
- "query": User is asking questions
  * English: "what's the price", "do you have..."
  * Khmer: "តម្លៃ", "មានអី", "មានអត់"
  
- "cancel": User wants to cancel
  * English: "no", "cancel", "nevermind"
  * Khmer: "ទេ", "លុបចោល", "បោះបង់"
  
- "unknown": Cannot determine intent

Item Extraction Rules:
- Extract product names as mentioned by user OR referenced in conversation
- If user says "I'll take it", "add that", "yes", "ok", look at recent bot messages for recommended products
- Look for product names in the last bot message if user is confirming/accepting
- Default qty to 1 if not specified
- For modify_cart, extract what user wants to change
- If user says "remove" or "delete", set qty to 0

Contact Extraction Rules:
- Extract name only if explicitly stated (e.g., "my name is", "I'm", "this is")
- Extract email only if valid format found
- Extract phone only if valid phone number found (digits, dashes, spaces, +)
- Extract address when user provides location/delivery information (street, city, building, etc.)
- Be conservative - only extract if confident

Confidence:
- High (0.8-1.0): Clear, unambiguous intent
- Medium (0.5-0.8): Likely intent but some ambiguity
- Low (0-0.5): Unclear or ambiguous

Output ONLY the JSON, no other text.`;

export async function extractSalesIntent(
  userText: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  currentStage?: string
): Promise<SalesIntent> {
  try {
    // Build context message
    let contextMsg = `Current conversation stage: ${currentStage || "discovering"}\n`;
    contextMsg += `User message: "${userText}"\n`;
    
    if (conversationHistory && conversationHistory.length > 0) {
      contextMsg += "\nRecent conversation:\n";
      conversationHistory.slice(-6).forEach((msg) => {
        contextMsg += `${msg.role === "user" ? "Customer" : "Bot"}: ${msg.content}\n`;
      });
      
      // Add explicit hint for product references
      contextMsg += `\nIMPORTANT: If the user says "yes", "I'll take it", "add that", "ok", etc., look for product names in the Bot's last message and extract those as items.\n`;
    }

    const resp = await fetch(appConfig.openai.baseUrl + "/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${appConfig.openai.apiKey}` 
      },
      body: JSON.stringify({
        model: appConfig.openai.model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: contextMsg },
        ]
      }),
    });

    const j = await resp.json().catch(() => null);
    const text = j?.choices?.[0]?.message?.content || "{}";
    
    // Extract JSON from response
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    const jsonStr = start >= 0 && end >= start ? trimmed.slice(start, end + 1) : "{}";
    const parsed = JSON.parse(jsonStr);
    
    const intent: SalesIntent = {
      intent: parsed?.intent || "unknown",
      items: Array.isArray(parsed?.items) && parsed.items.length > 0 ? parsed.items : undefined,
      contact: parsed?.contact || undefined,
      confidence: parsed?.confidence || 0.5,
    };
    
    return intent;
  } catch (error) {
    console.error("Intent extraction error:", error);
    return { intent: "unknown", confidence: 0 };
  }
}

/**
 * Validates if contact information is complete enough to proceed with order
 */
export function isContactComplete(contact?: { name?: string; email?: string; phone?: string }): boolean {
  if (!contact) return false;
  const hasName = contact.name && contact.name.trim().length > 2;
  const hasPhone = contact.phone && contact.phone.trim().length > 8;
  const hasEmail = contact.email && contact.email.includes("@") && contact.email.includes(".");
  return !!(hasName && (hasPhone || hasEmail));
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone format (flexible international format)
 */
export function isValidPhone(phone: string): boolean {
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // Check if it's mostly digits and optionally starts with +
  const phoneRegex = /^\+?[\d]{8,15}$/;
  return phoneRegex.test(cleaned);
}
