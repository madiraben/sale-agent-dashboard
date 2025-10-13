"use client";

import React from "react";
import Button from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function BillingBanner({ isActive }: { isActive: boolean }) {
  const router = useRouter();
  if (isActive) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-amber-800">
          Your workspace is inactive. Subscribe to continue using all features.
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push("/billing")}>Subscribe for $20/mo</Button>
          <button className="text-sm text-amber-700 underline" onClick={() => router.push("/billing")}>Learn more</button>
        </div>
      </div>
    </div>
  );
}


