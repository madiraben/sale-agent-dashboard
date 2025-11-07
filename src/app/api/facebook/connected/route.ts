import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unsubscribePageFromApp } from "@/lib/facebook/transport";

const GRAPH_VER = process.env.FB_GRAPH_VERSION || "v20.0";

export async function GET(req: NextRequest) {
  const id = req.cookies.get("fb_page_id")?.value || null;
  const nameEnc = req.cookies.get("fb_page_name")?.value || null;
  const name = nameEnc ? decodeURIComponent(nameEnc) : null;

  const userToken = req.cookies.get("fb_user_token")?.value || null;
  const pageToken = req.cookies.get("fb_page_token")?.value || null;

  let profile: { id?: string; name?: string; email?: string; picture?: string } | null = null;
  let page_picture: string | null = null;
  let pages: Array<{ id: string; name: string | null; is_active?: boolean }> = [];
  let active_page_ids: string[] = [];
  let active_pages: Array<{ id: string; name: string | null; picture?: string | null }> = [];

  try {
    if (userToken) {
      const meUrl = new URL(`https://graph.facebook.com/${GRAPH_VER}/me`);
      meUrl.searchParams.set("fields", "id,name,email,picture.type(square).height(128).width(128)");
      meUrl.searchParams.set("access_token", userToken);
      const meRes = await fetch(meUrl.toString(), { cache: "no-store" });
      if (meRes.ok) {
        const me = await meRes.json();
        profile = {
          id: me?.id,
          name: me?.name,
          email: me?.email,
          picture: me?.picture?.data?.url || null,
        } as any;
      }
    }
  } catch (error){
    // ignore profile fetch errors
    console.error("Error fetching profile:", error as Error);
  }

  try {
    if (id) {
      const picUrl = new URL(`https://graph.facebook.com/${GRAPH_VER}/${id}/picture`);
      picUrl.searchParams.set("type", "square");
      picUrl.searchParams.set("height", "128");
      picUrl.searchParams.set("width", "128");
      picUrl.searchParams.set("redirect", "false");
      const tokenForPage = pageToken || userToken;
      if (tokenForPage) picUrl.searchParams.set("access_token", tokenForPage);
      const pRes = await fetch(picUrl.toString(), { cache: "no-store" });
      if (pRes.ok) {
        const pj = await pRes.json();
        page_picture = pj?.data?.url || null; 
      }
    }
  } catch (error){
    // ignore page picture fetch errors
    console.error("Error fetching page picture:", error as Error);
    return NextResponse.json({ error: "error_fetching_page_picture" }, { status: 500 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: u } = await supabase.auth.getUser();
    if (u.user?.id) {
      const { data } = await supabase
        .from("facebook_pages")
        .select("page_id,page_name,is_active,page_token")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      const rows = (data || []);
      pages = rows.map((p: any) => ({ id: p.page_id, name: p.page_name, is_active: !!p.is_active }));
      const actives = rows.filter((p: any) => !!p.is_active);
      active_page_ids = actives.map((p: any) => p.page_id);

      // Resolve pictures for all active pages
      const picturePromises = actives.map(async (p: any) => {
        try {
          const picUrl = new URL(`https://graph.facebook.com/${GRAPH_VER}/${p.page_id}/picture`);
          picUrl.searchParams.set("type", "square");
          picUrl.searchParams.set("height", "128");
          picUrl.searchParams.set("width", "128");
          picUrl.searchParams.set("redirect", "false");
          const tokenForPage = p.page_token || pageToken || userToken;
          if (tokenForPage) picUrl.searchParams.set("access_token", tokenForPage);
          const pRes = await fetch(picUrl.toString(), { cache: "no-store" });
          let picture: string | null = null;
          if (pRes.ok) {
            const pj = await pRes.json();
            picture = pj?.data?.url || null;
          }
          return { id: p.page_id as string, name: (p.page_name as string) || null, picture };
        } catch {
          return { id: p.page_id as string, name: (p.page_name as string) || null, picture: null };
        }
      });
      active_pages = await Promise.all(picturePromises);
    }
  } catch {
    // ignore db errors
  }

  return NextResponse.json({ id, name, profile, page_picture, pages, active_page_id: id, active_page_ids, active_pages });
}

export async function DELETE() {
  try {
    // Remove all connected pages for this user and unsubscribe webhooks
    const supabase = await createSupabaseServerClient();
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;

    if (userId) {
      const { data: rows } = await supabase
        .from("facebook_pages")
        .select("page_id,page_token")
        .eq("user_id", userId);

      // Attempt to unsubscribe each page from the app before deletion (best-effort)
      if (Array.isArray(rows)) {
        await Promise.all(rows.map(async (r: any) => {
          try {
            if (r?.page_token && r?.page_id) {
              await unsubscribePageFromApp(r.page_token as string, r.page_id as string);
            }
          } catch (erorr){
            // ignore unsubscribe failures
            console.error("Error unsubscribing page from app:", erorr as Error);
            return { id: r.page_id as string, name: (r.page_name as string) || null, picture: null };
          }
        }));
      }

      // Delete all rows for the user
      await supabase.from("facebook_pages").delete().eq("user_id", userId);
    }
  } catch (error) {
    // ignore server-side cleanup errors; still clear cookies below
    console.error("Error deleting Facebook pages:", error as Error); 
  }

  // Clear all Facebook-related cookies
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: "fb_page_id", value: "", maxAge: 0, path: "/" });
  res.cookies.set({ name: "fb_page_name", value: "", maxAge: 0, path: "/" });
  res.cookies.set({ name: "fb_page_token", value: "", maxAge: 0, path: "/" });
  res.cookies.set({ name: "fb_user_token", value: "", maxAge: 0, path: "/" });
  res.cookies.set({ name: "fb_oauth_state", value: "", maxAge: 0, path: "/" });
  return res;
}


