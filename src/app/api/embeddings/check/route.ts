import { NextResponse } from "next/server";
import { getGoogleCloudAccessToken } from "@/lib/google-cloud-auth";

export async function GET() {
  try {
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (!projectId) {
      return NextResponse.json({ ok: false, reason: "GOOGLE_CLOUD_PROJECT_ID not set" }, { status: 500 });
    }

    const token = await getGoogleCloudAccessToken();

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


