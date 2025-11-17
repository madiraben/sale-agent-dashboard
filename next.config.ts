import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: (() => {
          try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL|| "https://example.supabase.co").hostname; } catch { return "example.supabase.co"; }
        })(),
      },
      {
        protocol: "https",
        hostname: "static0.xdaimages.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
