import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Basic CSRF/Origin check
  const appUrl = process.env.APP_URL;
  const origin = req.headers.get("origin") || "";
  if (appUrl && origin && origin !== appUrl) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const pageId = (body?.page_id as string | undefined) || null;
  if (!pageId) return NextResponse.json({ error: "missing_page_id" }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("facebook_pages")
      .select("page_id,page_name,page_token")
      .eq("user_id", userId)
      .eq("page_id", pageId)
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const res = NextResponse.json({ ok: true, page: { id: data.page_id, name: data.page_name } });
    res.cookies.set({ name: "fb_page_id", value: data.page_id, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
    res.cookies.set({ name: "fb_page_name", value: encodeURIComponent(data.page_name || ""), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
    if (data.page_token) {
      res.cookies.set({ name: "fb_page_token", value: data.page_token, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
    }
    return res;
  } catch {
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}


