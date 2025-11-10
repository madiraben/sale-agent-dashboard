import crypto from "crypto";
import type { NextRequest } from "next/server";
import { appConfig } from "@/lib/config";

export function verifyFacebookSignature(req: NextRequest, rawBody: string): boolean {
  try {
    const appSecret = appConfig.fbAppSecret;
    if (!appSecret) return true; // dev fallback
    const header = req.headers.get("x-hub-signature-256") || req.headers.get("x-hub-signature");
    if (!header) return false;
    const [algo, signature] = header.split("=");
    const hmac = crypto.createHmac(algo === "sha1" ? "sha1" : "sha256", appSecret);
    hmac.update(rawBody, "utf8");
    const expected = hmac.digest("hex");
    return signature === expected;
  } catch {
    return false;
  }
}

export function checkOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin") || "";
  const allowed = appConfig.appUrl;
  if (!allowed) return true; // not enforced without config
  // Allow exact APP_URL
  if (origin === allowed) return true;
  // Also allow same-origin requests (useful in dev when using localhost)
  const requestOrigin = req.nextUrl.origin;
  return origin !== "" && origin === requestOrigin;
}


