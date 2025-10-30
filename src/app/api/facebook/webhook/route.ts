import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { verifyFacebookSignature } from "@/lib/security/http";
import { handleMessengerText } from "@/lib/chat/orchestrator";

// GET: Webhook verification handshake
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === appConfig.fbWebhookVerifyToken) {
    return new NextResponse(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

// POST: Messenger webhook
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyFacebookSignature(req, raw)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 403 });
  }
  const body = JSON.parse(raw || "{}");
  try {
    const entries: any[] = Array.isArray(body?.entry) ? body.entry : [];
    for (const entry of entries) {
      const pageId: string | undefined = entry?.id;
      const messaging: any[] = Array.isArray(entry?.messaging) ? entry.messaging : [];
      if (!pageId || messaging.length === 0) continue;
      for (const evt of messaging) {
        const senderId = evt?.sender?.id;
        const text: string | undefined = evt?.message?.text;
        if (!senderId || !text) continue;
        await handleMessengerText(pageId, senderId, text);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unexpected_error" }, { status: 500 });
  }
}


