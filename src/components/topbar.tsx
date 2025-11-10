"use client";

import React from "react";
import LanguageSwitcher from "@/components/language-switcher";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type TopbarProps = {
  title?: string;
};

export default function Topbar({ title }: TopbarProps) {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };
  return (
    <header className="flex h-[80px] items-center justify-between border-b border-black/10 bg-white px-6 md:px-10">
      <div className="flex items-center gap-5">
        {title ? <h1 className="text-xl font-semibold text-gray-900">{title}</h1> : null}
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <IconButton aria-label="Notifications">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </IconButton>
        <div className="scale-110">
          <LanguageSwitcher />
        </div>
        <button onClick={handleSignOut} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Sign out
        </button>
        <IconButton aria-label="Apps">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
          </svg>
        </IconButton>
        <span className="ml-2">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
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
