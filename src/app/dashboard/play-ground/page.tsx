"use client";

import React from "react";
import ChatMessage from "@/components/ui/chat-message";
import ChatInput from "@/components/ui/chat-input";
import SearchInput from "@/components/ui/search-input";

type Msg = { id: string; role: "user" | "assistant"; content: string; time?: string };

export default function Playground() {
  const [messages, setMessages] = React.useState<Msg[]>([
    { id: "m1", role: "assistant", content: "Welcome to the RAG playground. Ask anything!", time: "now" },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const user: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, user]);

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
        }),
      });
      const data = await res.json();
      const assistantText = res.ok ? (data?.content ?? "(no content)") : (`Error: ${data?.details || data?.error || "Unknown error"}`);
      const reply: Msg = { id: crypto.randomUUID(), role: "assistant", content: assistantText };
      setMessages((m) => [...m, reply]);
    } catch (e) {
      const reply: Msg = { id: crypto.randomUUID(), role: "assistant", content: "Network error while contacting AI." };
      setMessages((m) => [...m, reply]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-80px-64px)] flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5H9v5a2 2 0 0 1-2 2H3z" />
          </svg>
          <span className="text-gray-700">Playground</span>
          <span>›</span>
          <span className="font-medium text-gray-900">RAG Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput className="hidden md:block" placeholder="Search history" />
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </button>
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl bg-gray-50 p-4">
        {messages.map((m) => (
          <ChatMessage key={m.id} role={m.role} content={m.content} time={m.time} />
        ))}
        {loading ? <ChatMessage role="assistant" content="Thinking..." /> : null}
      </div>

      <div className="mt-4">
        <ChatInput value={input} onChange={setInput} onSend={onSend} disabled={loading} />
      </div>
    </div>
  );
}
