import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium relies on relative path resolution to locate its
  // Chromium binary files. If webpack bundles it, those paths break and the
  // function can't find the binary on Vercel. playwright-core must also be
  // kept external so it can locate its own native modules at runtime.
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
};

export default nextConfig;
