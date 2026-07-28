import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Allow accessing the dev server from LAN IP (phone, other devices on Wi-Fi)
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.100.168",
    "192.168.100.71",
  ],
  // Parent Desktop/package-lock.json otherwise steals Turbopack's workspace root.
  turbopack: {
    root: process.cwd(),
  },
  // Prevent Turbopack from bundling firebase-admin (fixes ERR_REQUIRE_ESM / jose on Vercel).
  serverExternalPackages: ["firebase-admin"],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
