# Destoc

Destoc is a desktop-first design-review workspace for public GitHub repositories. It uses email/password authentication, captures component/page review context, persists AI-provider results, and creates sandbox-only revisions when a suggestion is accepted.

## Stack

- Next.js App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui, Bun
- PostgreSQL, Prisma 7 with the PostgreSQL adapter, Better Auth
- Vercel Sandbox for isolated repository execution; Vercel Blob for future screenshot persistence
- Upstash Redis for distributed rate limiting in production

## Local setup

```bash
cp .env.example .env
bun install
bun run db:migrate --name init
bun run db:seed
bun run dev
```

The seeded account defaults to `demo@destoc.local` / `DemoPassword123!`. Change both values outside local development.

## Commands

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bunx prisma validate
```

## Security and execution model

- Every workspace, project, review, suggestion, and revision is checked against the authenticated owner server-side.
- Public HTTPS GitHub repository URLs are the only accepted source type. No GitHub token or repository write access is used.
- Sandbox/review/mutation/auth requests are rate limited. Production requires Upstash; local development uses a process-local fallback only.
- Suggested patches are limited to one selected UI file under `src/app` or `src/components`; environment files, package files, lockfiles, and traversal paths are rejected.
- Vercel Sandbox credentials stay in the host process. Imported code receives no application credentials, and its egress is denied after dependency installation.

## Environment

See `.env.example`. `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID` are required only when running imported repositories in Vercel Sandbox. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are mandatory in production.

### Local review provider

For API-key-free experiments, keep `DESIGN_REVIEW_PROVIDER="mock"`. To test real provider plumbing against a local or proxy server, run any OpenAI-compatible `/chat/completions` endpoint and set:

```bash
DESIGN_REVIEW_PROVIDER="local"
LOCAL_AI_BASE_URL="http://localhost:11434/v1"
LOCAL_AI_MODEL="your-model"
LOCAL_AI_API_KEY=""
```

Do not point this at cached Codex or ChatGPT session tokens. Destoc only supports explicit provider endpoints and explicit env-provided credentials.

## Current limitations

- The deterministic mock provider remains the safest free default. A local OpenAI-compatible provider is available for experiments, and the DeepSeek provider boundary exists, but the production DeepSeek integration is not yet implemented.
- Only common public Next.js/Vite-style repositories are in scope. Private repositories, GitHub OAuth, GitHub write-back/PRs, webhooks, and scheduled reviews are deferred.
- `DESIGN.md` is intentionally deferred until core product work is approved, per project guidance.
