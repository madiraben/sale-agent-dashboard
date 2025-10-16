"use client";

import React from "react";
import LoadingScreen from "@/components/loading-screen";

export default function PortalRedirectPage() {
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function go() {
      try {
        const res = await fetch("/api/billing/create-portal", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!isMounted) return;
        if (res.ok && data?.url) {
          window.location.href = data.url as string;
          return;
        }
        const msg = data?.error ? `${data.error}${data?.details ? `: ${data.details}` : ""}` : "Failed to open billing portal";
        setError(msg);
      } catch (e) {
        if (!isMounted) return;
        setError("Network error opening billing portal");
      }
    }
    go();
    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#EEF2F7]">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
          <div className="mb-2 text-lg font-semibold text-gray-900">Unable to open portal</div>
          <div className="text-sm text-gray-700">{error}</div>
        </div>
      </div>
    );
  }

  return <LoadingScreen message="Opening your billing portal..." />;
}


