import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleTelegramText } from "@/lib/chat/orchestrator";

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

  const userId = (bot as any).user_id as string;
  const botToken = (bot as any).bot_token as string;
  await handleTelegramText(userId, botToken, chatId, text);

  return NextResponse.json({ ok: true });
}


