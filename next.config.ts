import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Native / Node-only packages that must not be bundled by the server build.
  serverExternalPackages: [
    "@anthropic-ai/claude-agent-sdk",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "sharp",
    "pino",
    "pino-pretty",
  ],
};

export default nextConfig;
