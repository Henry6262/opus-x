import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

// Mirror the hardcoded-mode toggle from src/lib/config.ts so the dev proxy
// targets match the runtime config without importing browser-only env code.
const HARDCODED_MODE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_HARDCODED_MODE !== undefined
    ? process.env.NEXT_PUBLIC_HARDCODED_MODE === "true"
    : true;

const DEVPRINT_TARGET = HARDCODED_MODE
  ? "https://devprint-v2-production.up.railway.app"
  : (process.env.DEVPRNT_CORE_URL || "https://devprint-v2-production.up.railway.app").replace(
      /\/$/,
      ""
    );

const PONZINOMICS_TARGET = HARDCODED_MODE
  ? "https://ponzinomics-production.up.railway.app"
  : (process.env.PONZINOMICS_API_URL || "https://ponzinomics-production.up.railway.app").replace(
      /\/$/,
      ""
    );

const nextConfig: NextConfig = {
  // Pin the tracing root to this app's directory. Prevents Next.js from
  // inferring the monorepo root (where the parent bun.lock lives) and
  // duplicating the path on Vercel builds.
  outputFileTracingRoot: path.resolve(__dirname),

  // i18n routing is handled by middleware
  async rewrites() {
    return [
      {
        source: "/api/devprint/:path*",
        destination: `${DEVPRINT_TARGET}/:path*`,
      },
      {
        source: "/api/ponzinomics/:path*",
        destination: `${PONZINOMICS_TARGET}/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    // Required for React 19 + Next.js 16 compatibility
    serverActions: {},
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
