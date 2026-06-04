import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Construct the real client lazily so `next build` (and `prisma generate`) work
// without a database connection — the DATABASE_URL check only fires on first
// query, i.e. at request time.
function makeClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Cache on globalThis in dev so Next's HMR doesn't open a new pool per reload.
declare global {
  var __aiImageGenPrisma: PrismaClient | undefined;
}

let cached: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (globalThis.__aiImageGenPrisma) return globalThis.__aiImageGenPrisma;
  if (!cached) {
    cached = makeClient();
    if (process.env.NODE_ENV !== "production") {
      globalThis.__aiImageGenPrisma = cached;
    }
  }
  return cached;
}

// Lazy proxy — real client built on first property access, not at import time.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
