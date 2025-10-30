import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const id = req.cookies.get("fb_page_id")?.value || null;
  const nameEnc = req.cookies.get("fb_page_name")?.value || null;
  const name = nameEnc ? decodeURIComponent(nameEnc) : null;
  return NextResponse.json({ id, name });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: "fb_page_id", value: "", maxAge: 0, path: "/" });
  res.cookies.set({ name: "fb_page_name", value: "", maxAge: 0, path: "/" });
  res.cookies.set({ name: "fb_page_token", value: "", maxAge: 0, path: "/" });
  return res;
}


