import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appConfig } from "@/lib/config";
import { checkOrigin } from "@/lib/security/http";
import { setWebhook } from "@/lib/telegram/transport";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  if (!checkOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const botToken: string | undefined = body?.bot_token;
  if (!botToken) return NextResponse.json({ error: "missing_bot_token" }, { status: 400 });

  // Validate token with getMe
  let botUsername: string | undefined;
  let botId: string | undefined;
  try {
    const meResp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, { cache: "no-store" });
    if (!meResp.ok) return NextResponse.json({ error: "invalid_bot_token" }, { status: 400 });
    const me = await meResp.json();
    if (!me?.ok || !me?.result?.username) return NextResponse.json({ error: "invalid_bot_token" }, { status: 400 });
    botUsername = me.result.username as string;
    botId = String(me.result.id ?? "");
  } catch {
    return NextResponse.json({ error: "invalid_bot_token" }, { status: 400 });
  }

  // Generate or reuse secret
  let secret: string;
  {
    const { data: existing } = await supabase
      .from("telegram_bots")
      .select("secret")
      .eq("user_id", userId)
      .maybeSingle();
    secret = (existing as any)?.secret || randomUUID();
  }

  // Configure webhook
  const baseUrl = appConfig.appUrl || process.env.APP_URL || "";
  if (!baseUrl) return NextResponse.json({ error: "app_url_not_configured" }, { status: 500 });
  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook/${secret}`;
  const ok = await setWebhook(botToken, webhookUrl);
  if (!ok) return NextResponse.json({ error: "webhook_setup_failed" }, { status: 500 });

  // Upsert
  const { error } = await supabase
    .from("telegram_bots")
    .upsert(
      { user_id: userId, bot_token: botToken, bot_username: botUsername, bot_id: botId, secret },
      { onConflict: "user_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, bot: { username: botUsername, id: botId } });
}


