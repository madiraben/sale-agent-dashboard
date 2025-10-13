"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

export default function BillingGate({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  React.useEffect(() => {
    const allow = ["/dashboard/billing", "/dashboard/profile"];
    if (!isActive && !allow.includes(pathname)) {
      router.replace("/dashboard/billing");
    }
  }, [isActive, pathname]);
  return <>{children}</>;
}


