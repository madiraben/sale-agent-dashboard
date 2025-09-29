"use client";

import Image from "next/image";
import React, { useState } from "react";

type Language = "EN" | "KM";

type LanguageSwitcherProps = {
  value?: Language;
  onChange?: (lang: Language) => void;
};

export default function LanguageSwitcher({ value = "EN", onChange }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const current = value;

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-block h-4 w-6 overflow-hidden">
          {current === "KM" ? (
            <Image src="/images/flags/CAM.svg" alt="Khmer" width={24} height={16} className="inline" />
          ) : (
            <Image src="/images/flags/US.svg" alt="English" width={24} height={16} className="inline" />
          )}
        </span>
        {current}
        <svg className="ml-1 h-3 w-3" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-10">
          {(["KM", "EN"] as Language[]).map((lang) => (
            <button
              key={lang}
              className={`flex items-center gap-2 w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${current === lang ? "font-semibold" : ""}`}
              onClick={() => {
                onChange?.(lang);
                setOpen(false);
              }}
            >
              <Image src={`/images/flags/${lang === "KM" ? "CAM" : "US"}.svg`} alt={lang} width={24} height={16} className="inline" />
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
