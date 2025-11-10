import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { verifyFacebookSignature } from "@/lib/security/http";
import { handleMessengerText } from "@/lib/chat/orchestrator";
import logger from "@/lib/logger";

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

// Track recent message IDs to prevent duplicate processing
const processedMessages = new Set<string>();
const MESSAGE_EXPIRY = 60000; // 1 minute

// POST: Messenger webhook
export async function POST(req: NextRequest) {
  const raw = await req.text();
  logger.info(`[INFO] Received webhook: ${raw}`);
  if (!verifyFacebookSignature(req, raw)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 403 });
  }
  const body = JSON.parse(raw || "{}");
  
  // Respond to Facebook immediately to prevent retries
  const entries: any[] = Array.isArray(body?.entry) ? body.entry : [];
  
  // Process messages asynchronously (don't await)
  (async () => {
    try {
      for (const entry of entries) {
        const pageId: string | undefined = entry?.id;
        const messaging: any[] = Array.isArray(entry?.messaging) ? entry.messaging : [];
        if (!pageId || messaging.length === 0) continue;
        
        for (const evt of messaging) {
          const senderId = evt?.sender?.id;
          const text: string | undefined = evt?.message?.text;
          const messageId = evt?.message?.mid; // Facebook message ID
          
          if (!senderId || !text) continue;
          
          // Prevent duplicate processing using message ID
          const dedupeKey = messageId || `${pageId}:${senderId}:${text}:${evt?.timestamp}`;
          if (processedMessages.has(dedupeKey)) {
            logger.info(`[INFO] Skipping duplicate message: ${dedupeKey}`);
            continue;
          }
          
          // Mark as processed
          processedMessages.add(dedupeKey);
          setTimeout(() => processedMessages.delete(dedupeKey), MESSAGE_EXPIRY);
          
          // Process message
          logger.info(`[INFO] Recieved message: ${text}`);
          const result = await handleMessengerText(pageId, senderId, text);
          logger.info(`[INFO] Message processed: ${result}`);
        }
      }
    } catch (e: any) {
      logger.error("[ERROR] Failed to process webhook:", e?.message || e);
    }
  })();
  
  // Return immediately
  return NextResponse.json({ ok: true });
}


