import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const isLogin = url.pathname === "/login";
  const hasSessionCookie = Boolean(req.cookies.get("sb-access-token")?.value);

  if (isLogin && hasSessionCookie) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/login", "/auth/register"],
};


