export async function setWebhook(botToken: string, webhookUrl: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
    });
    const j = await resp.json().catch(() => ({}));
    return Boolean(resp.ok && (j?.ok ?? true));
  } catch {
    return false;
  }
}

export async function deleteWebhook(botToken: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
    const resp = await fetch(url, { method: "POST" });
    const j = await resp.json().catch(() => ({}));
    return Boolean(resp.ok && (j?.ok ?? true));
  } catch {
    return false;
  }
}

export async function sendTelegramText(botToken: string, chatId: string | number, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => {});
}


