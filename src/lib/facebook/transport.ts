import { appConfig } from "@/lib/config";
import logger from "@/lib/logger";

export async function sendMessengerText(pageToken: string, recipientId: string, text: string): Promise<boolean> {
  const url = new URL(`https://graph.facebook.com/${appConfig.fbGraphVersion}/me/messages`);
  url.searchParams.set("access_token", pageToken);
  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  return Boolean(resp.ok && resp.status === 200);
}

/**
 * Send typing indicator to show bot is processing
 * @param action - "typing_on", "typing_off", or "mark_seen"
 */
export async function sendMessengerSenderAction(
  pageToken: string, 
  recipientId: string, 
  action: "typing_on" | "typing_off" | "mark_seen"
): Promise<boolean> {
  const url = new URL(`https://graph.facebook.com/${appConfig.fbGraphVersion}/me/messages`);
  url.searchParams.set("access_token", pageToken);
  
  try {
    const resp = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        recipient: { id: recipientId }, 
        sender_action: action 
      }),
    });
    return Boolean(resp.ok && resp.status === 200);
  } catch (error) {
    logger.error(`Failed to send sender action ${action}:`, error);
    return false;
  }
}

/**
 * Show typing indicator (turns on automatically for 20 seconds or until message sent)
 */
export async function showTypingIndicator(pageToken: string, recipientId: string): Promise<boolean> {
  return sendMessengerSenderAction(pageToken, recipientId, "typing_on");
}

/**
 * Hide typing indicator
 */
export async function hideTypingIndicator(pageToken: string, recipientId: string): Promise<boolean> {
  return sendMessengerSenderAction(pageToken, recipientId, "typing_off");
}

/**
 * Mark message as seen/read
 */
export async function markMessageAsSeen(pageToken: string, recipientId: string): Promise<boolean> {
  return sendMessengerSenderAction(pageToken, recipientId, "mark_seen");
}

export async function subscribePageToApp(pageToken: string, pageId: string) {
  const url = new URL(`https://graph.facebook.com/${appConfig.fbGraphVersion}/${pageId}/subscribed_apps`);
  url.searchParams.set("access_token", pageToken);
  url.searchParams.set("subscribed_fields", [
    "messages",
    "messaging_postbacks",
  ].join(","));
  await fetch(url.toString(), { method: "POST" });
}

export async function unsubscribePageFromApp(pageToken: string, pageId: string) {
  const url = new URL(`https://graph.facebook.com/${appConfig.fbGraphVersion}/${pageId}/subscribed_apps`);
  url.searchParams.set("access_token", pageToken);
  await fetch(url.toString(), { method: "DELETE" });
}


