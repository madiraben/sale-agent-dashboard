import React from "react";
import Button from "@/components/ui/button";

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function ChatInput({ value, onChange, onSend, placeholder = "Type a message...", disabled }: ChatInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white p-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded-lg px-3 py-2 outline-none placeholder:text-gray-400 disabled:bg-gray-50"
      />
      <Button onClick={onSend} disabled={disabled} className="gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        Send
      </Button>
    </div>
  );
}


