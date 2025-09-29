import Image from "next/image";
import React from "react";

type AuthCardProps = {
  imageSrc?: string;
  children: React.ReactNode;
};

export default function AuthCard({ imageSrc = "/images/apps/loginImage.png", children }: AuthCardProps) {
  return (
    <div className="mx-auto mt-6 max-w-7xl px-6 pb-16">
      <div className="grid overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 md:grid-cols-2">
        <div className="relative hidden min-h-[520px] md:block">
          <Image src={imageSrc} alt="auth" width={700} height={700} className="object-cover" priority />
        </div>
        <div className="relative p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
