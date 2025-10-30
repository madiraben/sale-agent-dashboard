import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const GRAPH_VER = process.env.FB_GRAPH_VERSION || "v20.0";

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

    const userToken = req.cookies.get("fb_user_token")?.value;
    if (!userToken) return NextResponse.json({ error: "fb_not_connected" }, { status: 400 });

    // Find page info and token from Graph API
    const url = new URL(`https://graph.facebook.com/${GRAPH_VER}/me/accounts`);
    url.searchParams.set("access_token", userToken);
    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ error: "cannot_list_pages" }, { status: 400 });
    const j = await r.json();
    const pages: any[] = Array.isArray(j?.data) ? j.data : [];
    const match = pages.find((p) => p.id === pageId);
    if (!match) return NextResponse.json({ error: "page_not_found" }, { status: 404 });

    const pageToken = match.access_token as string | undefined;
    const pageName = match.name as string | undefined;

    // Upsert into facebook_pages
    const { error } = await supabase
      .from("facebook_pages")
      .upsert(
        {
          user_id: userId,
          page_id: pageId,
          page_name: pageName,
          page_token: pageToken,
        },
        { onConflict: "user_id,page_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-subscribe this page to the app's webhook for Messenger messages
    try {
      if (pageToken) {
        const subUrl = new URL(`https://graph.facebook.com/${GRAPH_VER}/${pageId}/subscribed_apps`);
        subUrl.searchParams.set("access_token", pageToken);
        subUrl.searchParams.set("subscribed_fields", [
          "messages",
          "messaging_postbacks",
          // add more if needed, e.g., 'message_deliveries','message_reads'
        ].join(","));
        await fetch(subUrl.toString(), { method: "POST" });
      }
    } catch {
      // swallow subscription errors; user can retry later
    }

    return NextResponse.json({ ok: true, page: { id: pageId, name: pageName } });
  } catch {
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}


