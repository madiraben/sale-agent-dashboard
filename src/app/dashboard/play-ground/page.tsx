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
  const [conversationHistory, setConversationHistory] = React.useState<any[]>([]);

  // Memoized message row to avoid re-rendering older messages during streaming
  const MemoChatMessage = React.useMemo(() => React.memo(ChatMessage), []);

  // Streaming performance refs
  const abortRef = React.useRef<AbortController | null>(null);
  const pendingChunkRef = React.useRef<string>("");
  const rafIdRef = React.useRef<number | null>(null);
  const lastAssistantContentRef = React.useRef<string>("");

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      abortRef.current?.abort();
    };
  }, []);

  async function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");

    // Append user message
    const user: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, user]);

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    // Create placeholder assistant message for streaming updates
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);

    // Reset streaming refs
    pendingChunkRef.current = "";
    lastAssistantContentRef.current = "";

    setLoading(true);
    try {
      const resp = await fetch("/api/rag-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, conversationHistory }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        let msg = "AI chat failed";
        try { const e = await resp.json(); msg = e?.error || msg; } catch {}
        throw new Error(msg);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const flush = () => {
        const chunk = pendingChunkRef.current;
        if (!chunk) return;
        pendingChunkRef.current = "";
        lastAssistantContentRef.current += chunk;
        setMessages((m) => m.map((msg) => (msg.id === assistantId ? { ...msg, content: lastAssistantContentRef.current } : msg)));
      };

      const scheduleFlush = () => {
        if (rafIdRef.current != null) return;
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          flush();
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "chunk" && evt.content) {
              pendingChunkRef.current += evt.content as string;
              scheduleFlush();
            }
          } catch {}
        }
      }

      // Final flush
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      flush();

      const finalText = lastAssistantContentRef.current;
      if (finalText) {
        setConversationHistory((h) => {
          const next = [...h, { role: "user", content: text }, { role: "assistant", content: finalText }];
          // Keep only the last 8 entries to bound memory
          return next.slice(-8);
        });
      }
    } catch (e: any) {
      const errorText = e?.message || "Network error while contacting AI.";
      setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, content: `Error: ${errorText}` } : msg));
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
          <MemoChatMessage key={m.id} role={m.role} content={m.content} time={m.time} />
        ))}
        {loading ? <MemoChatMessage role="assistant" content="Thinking..." /> : null}
      </div>

      

      <div className="mt-4">
        <ChatInput value={input} onChange={setInput} onSend={onSend} disabled={loading} />
      </div>
    </div>
  );
}
