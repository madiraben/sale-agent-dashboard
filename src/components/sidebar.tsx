"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";

export type SidebarItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  children?: SidebarItem[];
};

type SidebarProps = {
  items: SidebarItem[];
  className?: string;
};

function ItemContainer({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`group relative flex items-center gap-4 rounded-lg px-4 py-3 text-base transition-colors ${
        active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      {active ? <span className="absolute inset-y-0 left-0 w-1 rounded-r bg-[#1E8BF7]" /> : null}
      {children}
    </div>
  );
}

export default function Sidebar({ items, className = "" }: SidebarProps) {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Auto-open the parent group if current path matches
    const parentWithMatch = items.find((it) => Array.isArray(it.children) && pathname.startsWith(it.href));
    if (parentWithMatch) {
      setOpenGroup(parentWithMatch.href);
    }
  }, [pathname, items]);

  return (
    <aside className={`flex h-dvh w-64 flex-col bg-[#0b213f] ${className}`}>
      <div className="flex h-[72px] items-center gap-3 px-5">
        <Image src="/images/logo/logo2.png" alt="logo" width={42} height={42} />
        <div className="text-lg font-semibold text-white">SALE AGENCY</div>
      </div>
      <nav className="mt-3 flex-1 space-y-2 px-4">
        {items.map((item, idx) => {
          const hasChildren = Array.isArray(item.children) && item.children.length > 0;
          const parentActive = pathname.startsWith(item.href);
          const isOpen = openGroup === item.href || parentActive;

          if (hasChildren) {
            return (
              <div key={item.href ?? idx}>
                <button
                  type="button"
                  onClick={() => setOpenGroup((prev) => (prev === item.href ? null : item.href))}
                  className="w-full text-left"
                >
                  <ItemContainer active={parentActive}>
                    {item.icon ? <span className="shrink-0 text-white/80">{item.icon}</span> : null}
                    <span className="truncate">{item.label}</span>
                    <span className="ml-auto inline-flex items-center justify-center text-white/70">
                      <svg
                        className={`h-4 w-4 transform transition-transform ${isOpen ? "rotate-90" : "rotate-0"}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </span>
                  </ItemContainer>
                </button>
                {isOpen ? (
                  <div className="mt-1 space-y-1 pl-6">
                    {item.children!.map((child, cidx) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link key={child.href ?? cidx} href={child.href}>
                          <ItemContainer active={childActive}>
                            {child.icon ? <span className="shrink-0 text-white/80">{child.icon}</span> : null}
                            <span className="truncate">{child.label}</span>
                          </ItemContainer>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          const active = pathname === item.href;
          return (
            <Link key={item.href ?? idx} href={item.href}>
              <ItemContainer key={item.label ?? idx} active={active}>
                {item.icon ? <span className="shrink-0 text-white/80">{item.icon}</span> : null}
                <span className="truncate">{item.label}</span>
              </ItemContainer>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 p-5 text-sm text-white/50">v0.1.0</div>
    </aside>
  );
}

export const Icons = {
  dashboard: (
    <svg className="h-[24px] w-[24px] text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 12h7v9H3z" />
    </svg>
  ),
  cart: (
    <svg className="h-[24px] w-[24px] text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  box: (
    <svg className="h-[24px] w-[24px] text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z" />
      <path d="M3.27 6.96L12 12l8.73-5.04" />
    </svg>
  ),
  users: (
    <svg className="h-[24px] w-[24px] text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  report: (
    <svg className="h-[24px] w-[24px] text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 13l3 3 7-7" />
    </svg>
  ),
  settings: (
    <svg className="h-[24px] w-[24px] text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
      <path d="M2 12h2M20 12h2M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
};
