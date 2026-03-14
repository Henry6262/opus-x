import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // turbopack disabled: native @next/swc-darwin-arm64 .node binary not available in this env;
  // webpack build works correctly. Re-enable when SWC binary resolves.
  // turbopack: {
  //   root: path.resolve(__dirname, "../.."),
  // },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
