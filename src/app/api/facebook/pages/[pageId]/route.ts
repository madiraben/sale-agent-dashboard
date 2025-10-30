import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unsubscribePageFromApp } from "@/lib/facebook/transport";

export async function DELETE(req: NextRequest, { params }: { params: { pageId: string } }) {
  // Basic CSRF/Origin check
  const appUrl = process.env.APP_URL;
  const origin = req.headers.get("origin") || "";
  if (appUrl && origin && origin !== appUrl) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const pageId = params?.pageId;
  if (!pageId) return NextResponse.json({ error: "missing_page_id" }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    // Get page token before deletion to unsubscribe
    const { data: row } = await supabase
      .from("facebook_pages")
      .select("page_token")
      .match({ user_id: userId, page_id: pageId })
      .maybeSingle();

    const { error } = await supabase
      .from("facebook_pages")
      .delete()
      .match({ user_id: userId, page_id: pageId });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If the deleted page is active, clear cookies
    const res = NextResponse.json({ ok: true });
    const activeId = req.cookies.get("fb_page_id")?.value;
    if (activeId && activeId === pageId) {
      res.cookies.set({ name: "fb_page_id", value: "", maxAge: 0, path: "/" });
      res.cookies.set({ name: "fb_page_name", value: "", maxAge: 0, path: "/" });
      res.cookies.set({ name: "fb_page_token", value: "", maxAge: 0, path: "/" });
    }

    // Unsubscribe the app from the page
    try {
      const pageToken = (row as any)?.page_token as string | undefined;
      if (pageToken) await unsubscribePageFromApp(pageToken, pageId);
    } catch {
      // ignore unsubscribe failure
    }
    return res;
  } catch {
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}


