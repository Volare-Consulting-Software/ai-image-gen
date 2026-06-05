# syntax=docker/dockerfile:1

# Single web image for the whole app. Built on Debian (glibc) so that sharp and
# the Claude Agent SDK's bundled native `claude` binary work without musl quirks.
# ImageMagick is installed so the Claude refiner can use `magick`/`convert` in
# addition to the sharp library.
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends imagemagick ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- builder: install all deps and build ----------------------------------
FROM base AS builder
# Prisma schema + config must be present before `npm ci` so the `postinstall`
# (prisma generate) succeeds.
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runner: production image ---------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Copy the built app plus the full dependency tree (Prisma client, sharp, and
# the bundled Claude Code binary all live in node_modules).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# Apply migrations, then start. App Runner injects the env (DB URL, API keys, S3).
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
