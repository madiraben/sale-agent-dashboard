"use client";

import dynamic from "next/dynamic";

const ToastProvider = dynamic(() => import("@/components/toast-provider"), { ssr: false });

export default function ClientToast() {
  return <ToastProvider />;
}


