import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantIdsForUser } from "@/lib/facebook/repository";
import { runRagWithContext } from "@/lib/rag/engine";
import { sendTelegramText } from "@/lib/telegram/transport";
import { processExternalMessage, storeExternalReply } from "@/lib/chat/external-session-manager";

type TelegramMessage = {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number | string };
    from?: { id: number | string };
  };
};

export async function POST(req: NextRequest, context: { params: Promise<{ secret: string }> }) {
  const { secret } = await context.params;
  if (!secret) return NextResponse.json({ error: "missing_secret" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: bot } = await admin
    .from("telegram_bots")
    .select("user_id, bot_token")
    .eq("secret", secret)
    .maybeSingle();
  if (!bot) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => ({}))) as TelegramMessage;
  const text = body?.message?.text;
  const chatId = body?.message?.chat?.id;
  if (!text || !chatId) return NextResponse.json({ ok: true });

  try {
    const userId = (bot as any).user_id as string;
    const tenantIds = await getTenantIdsForUser(userId);
    if (tenantIds.length === 0) return NextResponse.json({ ok: true });

    const tenantId = tenantIds[0]; // Use first tenant ID

    // Process message with session management
    const { conversationId, sectionId, previousSectionsSummary } = await processExternalMessage({
      platform: "telegram",
      externalUserId: String(chatId),
      shopOwnerUserId: userId,
      messageText: text,
      tenantId: tenantId,
    });

    // Generate reply with RAG + previous sections context
    const reply = await runRagWithContext(userId, tenantIds, text, previousSectionsSummary);

    // Store the assistant's reply
    await storeExternalReply({
      conversationId,
      sectionId,
      replyText: reply,
      tenantId: tenantId,
      userId: userId,
    });

    // Send reply via Telegram
    await sendTelegramText((bot as any).bot_token as string, chatId, reply);
  } catch (error) {
    console.error("Error handling Telegram message:", error);
    // Silent fail - Telegram will retry if we error
  }

  return NextResponse.json({ ok: true });
}


