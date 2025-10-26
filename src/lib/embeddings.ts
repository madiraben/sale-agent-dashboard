import crypto from "node:crypto";

async function getAccessTokenFromServiceAccount(): Promise<string> {
  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("GOOGLE_CLOUD_CLIENT_EMAIL and GOOGLE_CLOUD_PRIVATE_KEY must be set in environment variables");
  }

  const aud = "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    sub: clientEmail,
    aud,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    iat: now,
    exp: now + 3600,
  };
  const base64url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${base64url(header)}.${base64url(claim)}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign.sign(privateKey, "base64url");
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
  return data.access_token as string;
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
}

export async function getTextEmbedding(text: string): Promise<number[]> {
      if (!text || !text.trim()) throw new Error("text_required");
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
      if (!projectId) throw new Error("GOOGLE_CLOUD_PROJECT_ID not set in environment");

      const accessToken = await getAccessTokenFromServiceAccount();
      async function callForRegion(loc: string) {
        const url = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${loc}/publishers/google/models/multimodalembedding@001:predict`;
        const headers = new Headers({
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        });
        if (projectId) headers.set("x-goog-user-project", projectId);

        const body = { instances: [{ text }] };
        const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
        const ct = resp.headers.get("content-type") || "";
        const parsed = ct.includes("application/json") ? await resp.json() : await resp.text();
        return { resp, parsed } as const;
      }

      const regionsToTry = Array.from(new Set([location, "us-central1", "europe-west4"]));
      let finalData: any = null;
      for (const loc of regionsToTry) {
        const { resp, parsed } = await callForRegion(loc);
        if (resp.ok) {
          finalData = parsed;
          break;
        }
        if (resp.status !== 404) {
          throw new Error(typeof parsed === "string" ? parsed : parsed?.error?.message || "vertex_error");
        }
      }
      if (!finalData) throw new Error("model_not_found");

      const predictions = (finalData as any)?.predictions;
      if (!Array.isArray(predictions) || predictions.length === 0) {
        throw new Error("empty_predictions");
      }
      const first = predictions[0] || {};
      const textEmbedding = first.textEmbedding ? normalizeVector(first.textEmbedding as number[]) : null;
      if (!textEmbedding) throw new Error("no_text_embedding");
      return textEmbedding as number[];
    }


