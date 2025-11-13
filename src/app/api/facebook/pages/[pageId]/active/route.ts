import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const appUrl = process.env.APP_URL;
  const origin = req.headers.get("origin") || "";
  if (appUrl && origin && origin !== appUrl) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { pageId } = await params;
  if (!pageId) return NextResponse.json({ error: "missing_page_id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const active = Boolean(body?.active);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("facebook_pages")
      .update({ is_active: active })
      .match({ user_id: userId, page_id: pageId })
      .select("page_id,page_name,page_token")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // For compatibility with flows expecting a single cookie, set cookies when activating
    const res = NextResponse.json({ ok: true });
    if (active) {
      res.cookies.set({ name: "fb_page_id", value: data.page_id, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
      res.cookies.set({ name: "fb_page_name", value: encodeURIComponent(data.page_name || ""), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
      if (data.page_token) {
        res.cookies.set({ name: "fb_page_token", value: data.page_token, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
      }
    }
    return res;
  } catch {
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}


