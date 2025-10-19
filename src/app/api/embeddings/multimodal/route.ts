import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import crypto from "node:crypto";

type RequestBody = {
  text?: string;
  imageBase64?: string; // raw base64 (no data URL prefix)
  imageMimeType?: string; // e.g. "image/png"
  imageUrl?: string; // optional: server will fetch and convert to base64
};

async function getAccessTokenFromServiceAccount() {
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credsPath) throw new Error("GOOGLE_APPLICATION_CREDENTIALS not set");
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
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error_description || data?.error || "token_exchange_failed");
  return { accessToken: data.access_token as string };
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: buf.toString("base64"), mime };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credsPath) return NextResponse.json({ error: "missing_creds_path" }, { status: 500 });
    const saRaw = fs.readFileSync(credsPath, "utf8");
    const sa = JSON.parse(saRaw);
    const projectId: string | undefined = sa.project_id;
    if (!projectId) return NextResponse.json({ error: "missing_project_id_in_sa" }, { status: 500 });

    const { accessToken } = await getAccessTokenFromServiceAccount();

    let imagePart: any = null;
    if (body.imageBase64 && body.imageMimeType) {
      // Vertex AI expects { bytesBase64Encoded: "..." } format for images
      imagePart = { bytesBase64Encoded: body.imageBase64 };
    } else if (body.imageUrl) {
      const fetched = await fetchImageAsBase64(body.imageUrl);
      if (fetched) {
        imagePart = { bytesBase64Encoded: fetched.base64 };
      } else {
        // Image fetch failed - log it but continue with text-only if we have text
        console.warn(`Failed to fetch image from URL: ${body.imageUrl}`);
      }
    }

    // Check we have at least text or image
    if (!body.text && !imagePart) {
      return NextResponse.json({ error: "no_input", details: "Must provide text, imageBase64, or a valid imageUrl" }, { status: 400 });
    }

    async function callForRegion(loc: string) {
      const url = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${loc}/publishers/google/models/multimodalembedding@001:predict`;
      const headers = new Headers({
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      });
      if (projectId) headers.set("x-goog-user-project", projectId);
      
      // Build instance based on what we actually have
      const instance: any = {};
      if (body.text) instance.text = body.text;
      // Only add image if we successfully fetched/have the image data
      if (imagePart?.bytesBase64Encoded) instance.image = imagePart;
      
      const requestBody = {
        instances: [instance],
      };
      const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(requestBody) });
      const ct = resp.headers.get("content-type") || "";
      const parsed = ct.includes("application/json") ? await resp.json() : await resp.text();
      return { resp, parsed } as const;
    }

    const regionsToTry = Array.from(new Set([location, "us-central1", "europe-west4"]));
    let finalData: any = null;
    let usedRegion: string | null = null;
    for (const loc of regionsToTry) {
      const { resp, parsed } = await callForRegion(loc);
      if (resp.ok) {
        finalData = parsed;
        usedRegion = loc;
        break;
      }
      // If not found, try next region; for other errors, return immediately
      if (resp.status !== 404) {
        return NextResponse.json({ error: "vertex_error", status: resp.status, details: typeof parsed === "string" ? parsed : (parsed?.error?.message || parsed) }, { status: 500 });
      }
    }
    if (!finalData) {
      return NextResponse.json({ error: "vertex_error", status: 404, details: "Model not found in tried regions", tried: regionsToTry }, { status: 500 });
    }

    // Typical response via :predict => { predictions: [{ textEmbedding?: number[], imageEmbedding?: number[], embedding?: number[] }] }
    const predictions = (finalData as any)?.predictions;
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return NextResponse.json(
        { error: "vertex_error", status: 500, details: "Empty predictions from Vertex AI" },
        { status: 500 },
      );
    }
    const first = predictions[0] || {};
    const combined = first.embedding || first.combinedEmbedding || null;
    const textEmbedding = first.textEmbedding || null;
    const imageEmbedding = first.imageEmbedding || null;
    return NextResponse.json({ embedding: combined, textEmbedding, imageEmbedding, usedRegion });
  } catch (e: any) {
    console.error("Multimodal embedding error:", e);
    return NextResponse.json({ error: "unhandled", details: e?.message ?? "Failed", stack: e?.stack }, { status: 500 });
  }
}


