import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const appId = process.env.FB_APP_ID;
  const appUrl = process.env.APP_URL;
  if (!appId || !appUrl) {
    return NextResponse.json({ error: "facebook_oauth_not_configured" }, { status: 500 });
  }
  const ver = process.env.FB_GRAPH_VERSION || "v20.0";
  const redirectUri = `${appUrl}/api/facebook/oauth/callback`;
  const url = new URL(`https://www.facebook.com/${ver}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", [
    "public_profile",
    "email",
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_metadata",
  ].join(","));
  return NextResponse.redirect(url.toString());
}


