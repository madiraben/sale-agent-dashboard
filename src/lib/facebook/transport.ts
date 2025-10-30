import { appConfig } from "@/lib/config";

export async function sendMessengerText(pageToken: string, recipientId: string, text: string) {
  const url = new URL(`https://graph.facebook.com/${appConfig.fbGraphVersion}/me/messages`);
  url.searchParams.set("access_token", pageToken);
  await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
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


