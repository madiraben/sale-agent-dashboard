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
    ],
  },
};

export default nextConfig;
