import { NextRequest, NextResponse } from "next/server";

const GRAPH_VER = process.env.FB_GRAPH_VERSION || "v20.0";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("fb_user_token")?.value;
  if (!token) return NextResponse.json({ pages: [], connected: null }, { status: 200 });
  try {
    const url = new URL(`https://graph.facebook.com/${GRAPH_VER}/me/accounts`);
    url.searchParams.set("access_token", token);
    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ pages: [], connected: null }, { status: 200 });
    const j = await r.json();
    const pages = Array.isArray(j?.data)
      ? j.data.map((p: any) => ({ id: p.id, name: p.name, category: p.category }))
      : [];
    const connected = {
      id: req.cookies.get("fb_page_id")?.value || null,
      name: req.cookies.get("fb_page_name")?.value || null,
    };
    return NextResponse.json({ pages, connected });
  } catch {
    return NextResponse.json({ pages: [], connected: null }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("fb_user_token")?.value;
  if (!token) return NextResponse.json({ error: "not_connected" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const pageId = body?.page_id as string | undefined;
  if (!pageId) return NextResponse.json({ error: "missing_page_id" }, { status: 400 });
  try {
    const url = new URL(`https://graph.facebook.com/${GRAPH_VER}/me/accounts`);
    url.searchParams.set("access_token", token);
    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ error: "cannot_list_pages" }, { status: 400 });
    const j = await r.json();
    const pages: any[] = Array.isArray(j?.data) ? j.data : [];
    const match = pages.find((p) => p.id === pageId);
    if (!match) return NextResponse.json({ error: "page_not_found" }, { status: 404 });

    const res = NextResponse.json({ ok: true, page: { id: match.id, name: match.name } });
    res.cookies.set({ name: "fb_page_id", value: match.id, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
    res.cookies.set({ name: "fb_page_name", value: encodeURIComponent(match.name || ""), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
    // Optionally store page access token too if needed for server calls
    if (match.access_token) {
      res.cookies.set({ name: "fb_page_token", value: match.access_token, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
    }
    return res;
  } catch {
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}


