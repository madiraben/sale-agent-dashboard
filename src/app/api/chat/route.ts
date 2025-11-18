import logger from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages_required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    if (!apiKey) return NextResponse.json({ error: "openai_key_missing" }, { status: 500 });

    // Simple retry with exponential backoff and jitter for 429/5xx
    const maxRetries = 3;
    const baseDelayMs = 500;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const calcDelay = (attempt: number, retryAfterHeader?: string | null) => {
      if (retryAfterHeader) {
        const sec = Number(retryAfterHeader);
        if (!Number.isNaN(sec) && sec >= 0) return Math.min(5000, Math.max(500, sec * 1000));
      }
      const jitter = Math.floor(Math.random() * 250); // 0-249ms
      return Math.min(4000, baseDelayMs * Math.pow(2, attempt)) + jitter;
    };

    const payload = {
      model: "gpt-5-mini",
      messages
    };

    let resp: Response | null = null;
    let lastError: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      if (resp.ok) break;
      // Retry on 429 and 5xx
      if (resp.status === 429 || (resp.status >= 500 && resp.status <= 599)) {
        const retryAfter = resp.headers.get("retry-after");
        if (attempt < maxRetries) {
          await sleep(calcDelay(attempt, retryAfter));
          continue;
        }
      }
      // Non-retryable or out of retries
      try {
        const data = await resp.json();
        lastError = data?.error?.message || JSON.stringify(data);
      } catch {
        lastError = `HTTP ${resp.status}`;
      }
      break;
    }
    if (!resp) {
      return NextResponse.json({ error: "openai_error", details: "No response from provider" }, { status: 502 });
    }

    const data = await resp.json();
    if (!resp.ok) {
      const status = resp.status === 429 ? 429 : 502;
      const message =
        resp.status === 429
          ? "Rate limited by AI provider. Please retry in a moment."
          : data?.error?.message || lastError || "Provider error";
          logger.error("OpenAI error:", message);
      return NextResponse.json({ error: "openai_error", details: message }, { status });
    }
    const content = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ content });
  } catch (e: any) {
    return NextResponse.json({ error: "unhandled", details: e?.message ?? "Failed" }, { status: 500 });
  }
}
