import { createClient } from "@supabase/supabase-js";
import logger from "../logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface TenantSettings {
  botPersonality: string;
  promptTemplate?: string;
  welcomeMessage?: string;
  awayMessage?: string;
  fallbackMessage?: string;
  enableAutoResponse: boolean;
  enableRag: boolean;
}

const DEFAULT_PROMPT = `You are a friendly and helpful AI sales assistant for an online store. Your goal is to help customers find products, answer questions, and complete orders in a warm and conversational way.

Guidelines:
- Be warm, approachable, and use a conversational tone
- Use emojis occasionally to add personality (👋 😊 🎉)
- Show genuine interest in helping the customer
- Be patient and understanding
- Make shopping feel easy and enjoyable
- Recommend products based on customer needs
- Help customers complete their orders smoothly

Remember: You represent a friendly brand that cares about customer satisfaction!`;

/**
 * Load tenant settings including custom prompt template
 */
export async function getTenantSettings(tenantId: string): Promise<TenantSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .limit(1)
      .single();

    if (error || !data) {
      logger.warn(`No settings found for tenant ${tenantId}, using defaults`);
      return {
        botPersonality: "friendly",
        promptTemplate: DEFAULT_PROMPT,
        enableAutoResponse: true,
        enableRag: true,
      };
    }

    return {
      botPersonality: data.bot_personality || "friendly",
      promptTemplate: data.prompt_template || DEFAULT_PROMPT,
      welcomeMessage: data.welcome_message || undefined,
      awayMessage: data.away_message || undefined,
      fallbackMessage: data.fallback_message || undefined,
      enableAutoResponse: data.enable_auto_response ?? true,
      enableRag: data.enable_rag ?? true,
    };
  } catch (error) {
    logger.error("Error loading tenant settings:", error);
    // Return defaults on error
    return {
      botPersonality: "friendly",
      promptTemplate: DEFAULT_PROMPT,
      enableAutoResponse: true,
      enableRag: true,
    };
  }
}

