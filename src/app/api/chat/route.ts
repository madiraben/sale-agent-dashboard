import logger from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, strictLimiter } from "@/lib/rate-limit";
import { validate, chatMessageSchema } from "@/lib/validators";
import { fetchWithRetry } from "@/lib/fetch-with-timeout";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (10 requests per minute)
    const rateLimitError = await withRateLimit(req, 10, strictLimiter);
    if (rateLimitError) return rateLimitError;

    // Input validation
    const body = await req.json();
    const validation = validate(chatMessageSchema, body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error },
        { status: 400 }
      );
    }

    const { messages } = validation.data;

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    
    if (!apiKey) {
      logger.error("OpenAI API key not configured");
      return NextResponse.json({ error: "Service configuration error" }, { status: 500 });
    }

    const payload = {
      model: "gpt-4-mini",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    };

    // Make API call with timeout and retry
    const resp = await fetchWithRetry(
      `${baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
      3, // max retries
      30000 // 30 second timeout
    );

    // Handle response
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      const status = resp.status === 429 ? 429 : 502;
      const message =
        resp.status === 429
          ? "Rate limited by AI provider. Please retry in a moment."
          : "AI service temporarily unavailable";

      logger.error("OpenAI API error", { status: resp.status, error: errorData });
      return NextResponse.json({ error: "Provider error", message }, { status });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    // Validate output
    if (typeof content !== "string") {
      logger.error("Unexpected response format from OpenAI", { data });
      return NextResponse.json({ error: "Invalid response from AI service" }, { status: 502 });
    }

    return NextResponse.json({ content });
  } catch (error: any) {
    // Safe error handling - don't expose internals
    logger.error("Chat API error", { message: error?.message, stack: error?.stack });
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to process request" },
      { status: 500 }
    );
  }
}
