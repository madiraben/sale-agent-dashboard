import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkOrigin } from "@/lib/security/http";
import { deleteWebhook } from "@/lib/telegram/transport";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return NextResponse.json({});

  const { data } = await supabase
    .from("telegram_bots")
    .select("bot_username, bot_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return NextResponse.json({});
  return NextResponse.json({ username: (data as any).bot_username, id: (data as any).bot_id });
}

export async function DELETE(req: NextRequest) {
  if (!checkOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: row } = await supabase
    .from("telegram_bots")
    .select("bot_token")
    .eq("user_id", userId)
    .maybeSingle();

  if ((row as any)?.bot_token) {
    try { await deleteWebhook((row as any).bot_token as string); } catch {}
  }

  await supabase
    .from("telegram_bots")
    .delete()
    .eq("user_id", userId);

  return NextResponse.json({ ok: true });
}


