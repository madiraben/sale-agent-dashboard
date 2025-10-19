import { NextResponse } from "next/server";
import fs from "node:fs";
import crypto from "node:crypto";

async function getAccessToken(credsPath: string) {
  const raw = fs.readFileSync(credsPath, "utf8");
  const { client_email, private_key, token_uri } = JSON.parse(raw);
  const aud = token_uri || "https://oauth2.googleapis.com/token";

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
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error_description || data?.error || "token_exchange_failed");
  return data.access_token as string;
}

export async function GET() {
  try {
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
    if (!credsPath) return NextResponse.json({ ok: false, reason: "GOOGLE_APPLICATION_CREDENTIALS not set" }, { status: 500 });
    if (!fs.existsSync(credsPath)) return NextResponse.json({ ok: false, reason: "Credentials file not found", path: credsPath }, { status: 500 });

    const raw = fs.readFileSync(credsPath, "utf8");
    const sa = JSON.parse(raw);
    const projectId = sa.project_id as string | undefined;
    if (!projectId) return NextResponse.json({ ok: false, reason: "project_id missing in credentials" }, { status: 500 });

    const token = await getAccessToken(credsPath);

    // Try to call :predict with test input to verify access
    async function tryRegion(loc: string) {
      const modelName = `projects/${projectId}/locations/${loc}/publishers/google/models/multimodalembedding@001`;
      const url = `https://aiplatform.googleapis.com/v1/${modelName}:predict`;
      const headers = new Headers({ 
        Authorization: `Bearer ${token}`, 
        Accept: "application/json",
        "Content-Type": "application/json"
      });
      if (projectId) headers.set("x-goog-user-project", projectId);
      const body = JSON.stringify({
        instances: [{ text: "test" }]
      });
      const resp = await fetch(url, { method: "POST", headers, body });
      const ct = resp.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await resp.json() : await resp.text();
      return { resp, ct, data, modelName } as const;
    }
    const regionsToTry = Array.from(new Set([location, "us-central1", "europe-west4"]));
    for (const loc of regionsToTry) {
      const { resp, ct, data, modelName } = await tryRegion(loc);
      if (resp.ok) return NextResponse.json({ ok: true, projectId, location: loc, model: (data as any)?.name || modelName });
      if (resp.status !== 404) return NextResponse.json({ ok: false, reason: "model_access_failed", status: resp.status, contentType: ct, details: data }, { status: 500 });
    }
    return NextResponse.json({ ok: false, reason: "model_not_found_in_regions", tried: regionsToTry }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || "unhandled" }, { status: 500 });
  }
}


