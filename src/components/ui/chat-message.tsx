import React from "react";

type ChatMessageProps = {
  role: "user" | "assistant" | "system";
  content: React.ReactNode;
  time?: string;
};

export default function ChatMessage({ role, content, time }: ChatMessageProps) {
  const isUser = role === "user";
  const align = isUser ? "justify-end" : "justify-start";
  const bubble = isUser
    ? "bg-[#0F317A] text-white"
    : "bg-gray-100 text-gray-900";

  return (
    <div className={`flex ${align}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${bubble}`}>
        <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        {time ? <div className={`mt-1 text-[10px] ${isUser ? "text-white/70" : "text-gray-500"}`}>{time}</div> : null}
      </div>
    </div>
  );
}


