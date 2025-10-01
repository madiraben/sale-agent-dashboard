"use client";

import React from "react";

type SideDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string; // e.g., max-w-md
  children: React.ReactNode;
};

export default function SideDrawer({ open, onClose, title, footer, widthClassName = "max-w-md", children }: SideDrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className={`absolute right-0 top-0 h-full w-full bg-white shadow-xl ${widthClassName}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            <button aria-label="Close" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
          {footer ? <div className="border-t bg-white px-6 py-4">{footer}</div> : null}
        </div>
      </aside>
    </div>
  );
}


