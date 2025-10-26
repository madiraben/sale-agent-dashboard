import { NextRequest, NextResponse } from "next/server";
import { getGoogleCloudAccessToken } from "@/lib/google-cloud-auth";
import { MultimodalEmbeddingRequest, MultimodalEmbeddingResponse } from "@/types";

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
    const body = (await req.json()) as MultimodalEmbeddingRequest;
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (!projectId) {
      return NextResponse.json({ error: "GOOGLE_CLOUD_PROJECT_ID not set in environment" }, { status: 500 });
    }

    const accessToken = await getGoogleCloudAccessToken();

    let imagePart: any = null;
    // Prefer client-sent base64 to avoid SSRF
    if (body.imageBase64 && typeof body.imageBase64 === "string") {
      imagePart = { bytesBase64Encoded: body.imageBase64 };
    } else if (body.imageUrl && typeof body.imageUrl === "string") {
      try {
        const u = new URL(body.imageUrl);
        if (u.protocol === "https:") {
          const fetched = await fetchImageAsBase64(u.toString());
          if (fetched) {
            imagePart = { bytesBase64Encoded: fetched.base64 };
          } else {
            console.warn(`Failed to fetch image from URL: ${body.imageUrl}`);
          }
        } else {
          return NextResponse.json({ error: "invalid_image_url", details: "Only https URLs are allowed" } satisfies MultimodalEmbeddingResponse, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "invalid_image_url", details: "Malformed URL" } satisfies MultimodalEmbeddingResponse, { status: 400 });
      }
    }

    // Check we have at least text or image
    if (!body.text && !imagePart) {
      return NextResponse.json({ error: "no_input", details: "Must provide text, imageBase64, or a valid imageUrl" } satisfies MultimodalEmbeddingResponse, { status: 400 });
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
        return NextResponse.json({ error: "vertex_error", status: resp.status, details: typeof parsed === "string" ? parsed : (parsed?.error?.message || parsed) } satisfies MultimodalEmbeddingResponse, { status: 500 });
      }
    }
    if (!finalData) {
      return NextResponse.json({ error: "vertex_error", status: 404, details: "Model not found in tried regions" } satisfies MultimodalEmbeddingResponse, { status: 500 });
    }

    // Typical response via :predict => { predictions: [{ textEmbedding?: number[], imageEmbedding?: number[], embedding?: number[] }] }
    const predictions = (finalData as any)?.predictions;
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return NextResponse.json({ error: "vertex_error", status: 500, details: "Empty predictions from Vertex AI" } satisfies MultimodalEmbeddingResponse, { status: 500 });
    }
    const first = predictions[0] || {};
    
    // Normalize vectors for better similarity comparisons
    function normalizeVector(vector: number[]): number[] {
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
    }
    
    const combined = first.embedding || first.combinedEmbedding || null;
    const textEmbedding = first.textEmbedding ? normalizeVector(first.textEmbedding) : null;
    const imageEmbedding = first.imageEmbedding ? normalizeVector(first.imageEmbedding) : null;
    
    return NextResponse.json({
      embedding: combined || undefined,
      textEmbedding: textEmbedding || undefined,
      imageEmbedding: imageEmbedding || undefined,
      usedRegion: usedRegion || undefined,
    } satisfies MultimodalEmbeddingResponse);
  } catch (e: any) {
    console.error("Multimodal embedding error:", e);
    return NextResponse.json({ error: "unhandled", details: e?.message ?? "Failed" } satisfies MultimodalEmbeddingResponse, { status: 500 });
  }
}


