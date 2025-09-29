"use client";

import React from "react";
import LanguageSwitcher from "@/components/language-switcher";
import { FaUser, FaBell } from "react-icons/fa";

type TopbarProps = {
  title?: string;
};

export default function Topbar({ title }: TopbarProps) {
  return (
    <header className="flex h-[80px] items-center justify-between border-b border-black/10 bg-white px-6 md:px-10">
      <div className="flex items-center gap-5">
        {title ? <h1 className="text-xl font-semibold text-gray-900">{title}</h1> : null}
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <IconButton aria-label="Notifications">
          <FaBell size={24} />
        </IconButton>
        <div className="scale-110">
          <LanguageSwitcher />
        </div>
        <IconButton aria-label="Apps">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
          </svg>
        </IconButton>
        <span className="ml-2">
          <FaUser size={26} />
        </span>
      </div>
    </header>
  );
}

function IconButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-lg"
    >
      {children}
    </button>
  );
}
