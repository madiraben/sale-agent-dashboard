import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const appUrl = process.env.APP_URL;
  const ver = process.env.FB_GRAPH_VERSION || "v20.0";

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

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

    // TODO: Store longLivedToken securely (e.g., link to user session / Supabase) and proceed to page selection
    // For now, just signal success back to settings
    const redirect = new URL(settingsUrl);
    if (longLivedToken) {
      redirect.searchParams.set("fb", "ok");
    } else {
      redirect.searchParams.set("fb_error", "no_long_token");
    }
    return NextResponse.redirect(redirect.toString());
  } catch (_err) {
    const redirect = new URL(settingsUrl);
    redirect.searchParams.set("fb_error", "unexpected_error");
    return NextResponse.redirect(redirect.toString());
  }
}


