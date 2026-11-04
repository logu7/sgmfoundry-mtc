import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pure static export: the Cloudflare Worker serves ./out and owns /api.
  // No Node runtime, no server components.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
