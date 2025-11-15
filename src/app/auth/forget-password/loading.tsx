import Image from "next/image";
import AuthCard from "@/components/auth-card";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-[#EEF2F7]">
      <div className="mx-auto max-w-7xl px-6 pt-30">
        <Image src="/images/logo/logo.png" alt="Company logo" width={96} height={32} priority />
      </div>
      <AuthCard>
        <div className="absolute right-4 top-4">
          <div className="h-6 w-16 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="mx-auto max-w-md">
          <div className="mb-6 h-7 w-64 rounded bg-gray-200 animate-pulse" />
          <div className="space-y-4">
            <div className="h-12 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="mt-6 h-10 rounded bg-gray-200 animate-pulse" />
          <div className="mt-4 mx-auto h-4 w-72 rounded bg-gray-100" />
        </div>
      </AuthCard>
    </div>
  );
}


