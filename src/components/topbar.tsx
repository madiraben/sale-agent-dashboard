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
    <header 
      className="flex h-[80px] items-center justify-between bg-white px-6 md:px-10"
      style={{
        borderBottom: '2px solid',
        borderImage: 'linear-gradient(90deg, var(--brand-start), var(--brand-end)) 1'
      }}
    >
      <div className="flex items-center gap-5">
        {title ? <h1 className="text-xl font-bold text-gray-900">{title}</h1> : null}
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <IconButton aria-label="Notifications">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="transition-colors group-hover:stroke-[var(--brand-end)]">
            <defs>
              <linearGradient id="notif-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--brand-start)" />
                <stop offset="100%" stopColor="var(--brand-end)" />
              </linearGradient>
            </defs>
            <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" stroke="url(#notif-gradient)" strokeWidth="2" />
            <path d="M13.73 21a2 2 0 01-3.46 0" stroke="url(#notif-gradient)" strokeWidth="2" />
          </svg>
        </IconButton>
        <div className="scale-110">
          <LanguageSwitcher />
        </div>
        <button 
          onClick={handleSignOut} 
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, var(--brand-start), var(--brand-end))'
          }}
        >
          Sign out
        </button>
        <IconButton aria-label="Apps">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="apps-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--brand-start)" />
                <stop offset="100%" stopColor="var(--brand-end)" />
              </linearGradient>
            </defs>
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" stroke="url(#apps-gradient)" strokeWidth="2" />
          </svg>
        </IconButton>
        <span className="ml-2">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="user-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--brand-start)" />
                <stop offset="100%" stopColor="var(--brand-end)" />
              </linearGradient>
            </defs>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="url(#user-gradient)" strokeWidth="2" />
            <circle cx="12" cy="7" r="4" stroke="url(#user-gradient)" strokeWidth="2" />
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
      className="group inline-flex h-12 w-12 items-center justify-center bg-white text-lg transition-all hover:bg-brand-subtle relative"
      style={{
        borderRadius: '20%',
        background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, var(--brand-start), var(--brand-end)) border-box',
        border: '2px solid transparent'
      }}
    >
      {children}
    </button>
  );
}
