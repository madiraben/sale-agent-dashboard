import Image from "next/image";
import React from "react";

type LoadingScreenProps = {
  logoSrc?: string;
  backgroundClassName?: string;
  dotClassName?: string;
  message?: string;
};

export default function LoadingScreen({
  logoSrc = "/images/logo/logo2.png",
  backgroundClassName = "bg-[#EEF2F7]",
  dotClassName = "bg-[#1E8BF7]",
  message,
}: LoadingScreenProps) {
  return (
    <div className={`grid min-h-dvh place-items-center ${backgroundClassName}`}>
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center">
          <Image src={logoSrc} alt="App logo" width={120} height={120} priority />
        </div>
        {message ? (
          <div className="mt-4 text-sm text-gray-600">{message}</div>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotClassName} animate-bounce`} />
          <span className={`h-[6px] w-[6px] rounded-full ${dotClassName} opacity-70`} />
        </div>
      </div>
    </div>
  );
}


