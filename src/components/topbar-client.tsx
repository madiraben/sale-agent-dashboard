"use client";

import dynamic from "next/dynamic";

const Topbar = dynamic(() => import("@/components/topbar"), { ssr: false });

export default function TopbarClient(props: { title?: string }) {
  return <Topbar {...props} />;
}







