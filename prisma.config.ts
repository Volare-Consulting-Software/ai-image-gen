import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env. Load local env files for CLI/Migrate runs.
// No-op in production/CI where the connection URLs are already in the
// environment. `override: false` (default) means real env vars win.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  // Multi-file schema: point at the folder so Prisma merges schema.prisma
  // (generator + datasource), enums.prisma, and every model under tables/.
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrate / introspection use a DIRECT (non-pooled) connection. Read
    // process.env directly (not prisma/config's env()) so `prisma generate`
    // works at build time even when DIRECT_URL is unset (e.g. Docker build).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
