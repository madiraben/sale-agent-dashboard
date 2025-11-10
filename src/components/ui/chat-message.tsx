import React from "react";

type ChatMessageProps = {
  role: "user" | "assistant" | "system" | "sale agent";
  content: React.ReactNode;
  time?: string;
};

function parseTextIntoSegments(text: string): Array<{ type: "text" | "image"; content: string }> {
  // Split the input string into ordered segments of text and markdown images.
  // Example: "Item 1\n![img](url)\nMore" => [text: 'Item 1', image: 'url', text: 'More']
  const segments: Array<{ type: "text" | "image"; content: string }> = [];
  if (!text || typeof text !== "string") return segments;
  const mdImageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = mdImageRegex.exec(text)) !== null) {
    const idx = match.index;
    if (idx > lastIndex) {
      const txt = text.slice(lastIndex, idx).trim();
      if (txt.length > 0) segments.push({ type: "text", content: txt });
    }
    const url = match[1].trim();
    segments.push({ type: "image", content: url });
    lastIndex = mdImageRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    const txt = text.slice(lastIndex).trim();
    if (txt.length > 0) segments.push({ type: "text", content: txt });
  }
  return segments;
}

function renderTextWithBold(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`t-${idx++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(
      <strong key={`b-${idx++}`} className="font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = boldRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={`t-${idx++}`}>{text.slice(lastIndex)}</span>);
  }
  return <div className="whitespace-pre-wrap leading-relaxed">{parts}</div>;
}

export default function ChatMessage({ role, content, time }: ChatMessageProps) {
  const isUser = role === "user";
  const align = isUser ? "justify-end" : "justify-start";
  const bubble = isUser
    ? "bg-[#0F317A] text-white"
    : "bg-gray-100 text-gray-900";

  // If content is a string, parse into ordered text/image segments so images render inline under
  // their corresponding product text instead of all at the bottom.
  let segments: Array<{ type: "text" | "image"; content: string }> = [];
  if (typeof content === "string") {
    segments = parseTextIntoSegments(content as string);
  }

  const renderedContent =
    segments.length > 0 ? (
      segments.map((seg, idx) =>
        seg.type === "text" ? (
          <div key={`txt-${idx}`} className="mt-1">
            {renderTextWithBold(seg.content)}
          </div>
        ) : (
          <div key={`img-${idx}`} className="mt-2 flex justify-center">
            <img src={seg.content} alt={`img-${idx}`} className="w-full max-w-[360px] max-h-[360px] rounded-md object-contain" />
          </div>
        )
      )
    ) : (
      // Non-string content (React nodes) or empty: render directly
      content
    );

  return (
    <div className={`flex ${align}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${bubble}`}>
        {renderedContent}
        {time ? <div className={`mt-1 text-[10px] ${isUser ? "text-white/70" : "text-gray-500"}`}>{time}</div> : null}
      </div>
    </div>
  );
}


