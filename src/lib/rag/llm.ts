import { appConfig } from "@/lib/config";

export async function completeWithContext(systemPrompt: string, userText: string): Promise<string> {
  const resp = await fetch(appConfig.openai.baseUrl + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${appConfig.openai.apiKey}` },
    body: JSON.stringify({ model: appConfig.openai.model, messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ], temperature: 0.7, max_tokens: 400 }),
  });
  const j = await resp.json().catch(() => null);
  const text = j?.choices?.[0]?.message?.content || "Sorry, I couldn't find that.";
  return text;
}


