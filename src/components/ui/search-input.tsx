import React from "react";

type SearchInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export default function SearchInput({ className = "", ...props }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <input
        {...props}
        placeholder={props.placeholder ?? "Search"}
        className={`w-56 rounded-full border border-gray-300 bg-white px-9 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-[#3B82F6] ${className ?? ""}`}
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </span>
    </div>
  );
}


