import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleTelegramText } from "@/lib/chat/orchestrator";
import logger from "@/lib/logger";

export const runtime = "nodejs";

type TelegramMessageLike = {
  message_id: number;
  text?: string;
  caption?: string;
  chat: { id: number | string };
};

type TelegramUpdate = {
  message?: TelegramMessageLike;
  edited_message?: TelegramMessageLike;
  channel_post?: TelegramMessageLike;
  edited_channel_post?: TelegramMessageLike;
  // other update types are ignored
};

function extractTextAndChat(update: TelegramUpdate) {
  const m =
    update.message ??
    update.edited_message ??
    update.channel_post ??
    update.edited_channel_post;
  const text = m?.text ?? m?.caption;
  const chatId = m?.chat?.id;
  const messageId = m?.message_id;
  return { text, chatId: chatId != null ? String(chatId) : undefined, messageId };
}

export async function POST(req: NextRequest, context: { params: Promise<{ secret: string }> }) {
  const { secret } = await context.params;
  if (!secret) return NextResponse.json({ error: "missing_secret" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  // Try to fetch optional secret_token; fall back if column doesn't exist
  let bot: any | null = null;
  let dbError: any | null = null;
  {
    const { data, error } = await admin
      .from("telegram_bots")
      .select("user_id, bot_token, secret_token")
      .eq("secret", secret)
      .maybeSingle();
    bot = data;
    dbError = error;
    if (dbError && dbError.code === "42703") {
      const { data: data2, error: error2 } = await admin
        .from("telegram_bots")
        .select("user_id, bot_token")
        .eq("secret", secret)
        .maybeSingle();
      bot = data2;
      dbError = error2;
    }
  }
  if (dbError) {
    logger.error("telegram_webhook_db_error", { error: dbError });
    return NextResponse.json({ ok: true });
  }
  if (!bot) return NextResponse.json({ ok: true });

  // Optional: validate Telegram secret token header if you set it on setWebhook
  const headerToken = req.headers.get("x-telegram-bot-api-secret-token");
  if (bot?.secret_token && headerToken !== bot.secret_token) {
    logger.warn("telegram_webhook_secret_token_mismatch");
    return NextResponse.json({ ok: true });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }
  const { text, chatId, messageId } = extractTextAndChat(update);
  if (!text || !chatId) return NextResponse.json({ ok: true });

  logger.info("received_telegram_message", { text });

  const userId = (bot as any).user_id as string;
  const botToken = (bot as any).bot_token as string;
  try {
    await handleTelegramText(userId, botToken, chatId, text);
  } catch (err) {
    logger.error("handleTelegramText_failed", { err, chatId, messageId });
  }
  
  return NextResponse.json({ ok: true });
}
