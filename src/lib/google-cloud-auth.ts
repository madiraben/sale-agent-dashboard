import crypto from "node:crypto";

/**
 * Generate a Google Cloud access token using service account credentials from environment variables.
 * Requires GOOGLE_CLOUD_CLIENT_EMAIL and GOOGLE_CLOUD_PRIVATE_KEY to be set.
 */
export async function getGoogleCloudAccessToken(): Promise<string> {
  const client_email = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
  const private_key = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  if (!client_email || !private_key) {
    throw new Error("GOOGLE_CLOUD_CLIENT_EMAIL and GOOGLE_CLOUD_PRIVATE_KEY must be set in environment variables");
  }
  
  const aud = "https://oauth2.googleapis.com/token";

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: client_email,
    sub: client_email,
    aud,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    iat: now,
    exp: now + 3600,
  };
  
  const base64url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${base64url(header)}.${base64url(claim)}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign.sign(private_key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const resp = await fetch(aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error_description || data?.error || "token_exchange_failed");
  }
  
  return data.access_token as string;
}

