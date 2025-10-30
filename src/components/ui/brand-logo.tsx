"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

type BrandLogoProps = {
  href?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

export default function BrandLogo({
  href = "/",
  width = 96,
  height = 32,
  className,
  priority = false,
  alt = "Company logo",
}: BrandLogoProps) {
  return (
    <Link href={href} aria-label="Go to homepage" className={className}>
      <Image
        src="/images/logo/logo.png"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="h-auto w-auto"
      />
    </Link>
  );
}


