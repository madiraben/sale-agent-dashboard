import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ChatMessage = {
  owner_user_id: string;
  channel: "messenger" | "telegram";
  external_user_id: string;
  sender: "user" | "bot";
  message: string;
};

export async function logChatMessage(msg: ChatMessage): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("bot_chat_messages").insert({
      owner_user_id: msg.owner_user_id,
      channel: msg.channel,
      external_user_id: msg.external_user_id,
      sender: msg.sender,
      message: msg.message,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log but don't fail the main flow
    console.error("Failed to log chat message:", error);
  }
}

