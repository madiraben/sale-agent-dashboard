import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const appUrl = process.env.APP_URL;
  const ver = process.env.FB_GRAPH_VERSION || "v20.0";

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const settingsUrl = `${appUrl || ""}/dashboard/setting`;

  if (!appId || !appSecret || !appUrl) {
    const redirect = new URL(settingsUrl);
    redirect.searchParams.set("fb_error", "facebook_oauth_not_configured");
    return NextResponse.redirect(redirect.toString());
  }

  if (!code) {
    const redirect = new URL(settingsUrl);
    redirect.searchParams.set("fb_error", "missing_code");
    return NextResponse.redirect(redirect.toString());
  }

  try {
    // Validate state to prevent CSRF
    const expectedState = req.cookies.get("fb_oauth_state")?.value;
    if (!expectedState || !state || state !== expectedState) {
      const redirect = new URL(settingsUrl);
      redirect.searchParams.set("fb_error", "invalid_state");
      const res = NextResponse.redirect(redirect.toString());
      // clear state cookie
      res.cookies.set({ name: "fb_oauth_state", value: "", maxAge: 0, path: "/" });
      return res;
    }

    const redirectUri = `${appUrl}/api/facebook/oauth/callback`;

    // Step 1: Exchange code for short-lived user token
    const tokenUrl = new URL(`https://graph.facebook.com/${ver}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("code", code);

    const tokenResp = await fetch(tokenUrl.toString(), { cache: "no-store" });
    if (!tokenResp.ok) {
      const redirect = new URL(settingsUrl);
      redirect.searchParams.set("fb_error", "exchange_failed");
      return NextResponse.redirect(redirect.toString());
    }
    const tokenJson = await tokenResp.json();
    const shortLivedToken: string | undefined = tokenJson.access_token;
    if (!shortLivedToken) {
      const redirect = new URL(settingsUrl);
      redirect.searchParams.set("fb_error", "no_access_token");
      return NextResponse.redirect(redirect.toString());
    }

    // Step 2: Exchange for a long-lived user token
    const longUrl = new URL(`https://graph.facebook.com/${ver}/oauth/access_token`);
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", appId);
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const longResp = await fetch(longUrl.toString(), { cache: "no-store" });
    if (!longResp.ok) {
      const redirect = new URL(settingsUrl);
      redirect.searchParams.set("fb_error", "long_exchange_failed");
      return NextResponse.redirect(redirect.toString());
    }
    const longJson = await longResp.json();
    const longLivedToken: string | undefined = longJson.access_token;

    const redirect = new URL(settingsUrl);
    if (!longLivedToken) {
      redirect.searchParams.set("fb_error", "no_long_token");
      return NextResponse.redirect(redirect.toString());
    }

    // Set httpOnly cookie so server routes can list pages and connect one
    const res = NextResponse.redirect(redirect.toString());
    // clear state cookie
    res.cookies.set({ name: "fb_oauth_state", value: "", maxAge: 0, path: "/" });
    res.cookies.set({
      name: "fb_user_token",
      value: longLivedToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 60, // 60 days
    });
    return res;
  } catch (_err) {
    const redirect = new URL(settingsUrl);
    redirect.searchParams.set("fb_error", "unexpected_error");
    return NextResponse.redirect(redirect.toString());
  }
}


