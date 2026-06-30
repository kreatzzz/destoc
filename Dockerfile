FROM node:22-bookworm-slim AS base
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates curl openssl \
  && npm install --global bun@1.3.14 \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS production-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/destoc" \
  BETTER_AUTH_SECRET="build-time-placeholder-secret-at-least-32-chars" \
  BETTER_AUTH_URL="http://localhost:3000" \
  && bun run prebuild \
  && node node_modules/next/dist/bin/next build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV CODEX_HOME=/data/codex
ENV PATH="/root/.bun/bin:${PATH}"

ARG CODEX_VERSION=0.133.0
RUN bun add --global "@openai/codex@${CODEX_VERSION}" \
  && mkdir -p /data/codex

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/.next/standalone ./.next/standalone
COPY --from=builder /app/.next/static ./.next/standalone/.next/static
COPY --from=builder /app/public ./.next/standalone/public

RUN test -d .next/standalone/.next/static \
  && test -f .next/standalone/public/destoc-hero-bg.png \
  && test -x node_modules/.bin/prisma

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD if [ "${PROCESS_ROLE:-web}" = "worker" ]; then exit 0; else curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1; fi

CMD ["bash", "scripts/start-production.sh"]
