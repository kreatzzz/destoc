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

Agentation and the Next.js dev indicator are visible in local development by default. Set `NEXT_PUBLIC_SHOW_AGENTATION="false"` only if you need to temporarily hide the Agentation toolbar.

## Commands

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bunx prisma validate
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Coolify/Docker runbook. The app ships with a Dockerfile, standalone Next.js output, runtime Prisma migrations, and `/api/health` for container health checks.

## Security and execution model

- Every workspace, project, review, suggestion, and revision is checked against the authenticated owner server-side.
- Public HTTPS GitHub repository URLs are the only accepted source type. No GitHub token or repository write access is used.
- Sandbox/review/mutation/auth requests are rate limited. Production should use Upstash; a single-instance home-server deploy can explicitly enable the process-local fallback with `ALLOW_IN_MEMORY_RATE_LIMIT="true"`.
- Suggested patches are limited to one selected UI file under `src/app` or `src/components`; environment files, package files, lockfiles, and traversal paths are rejected.
- Vercel Sandbox credentials stay in the host process. Imported code receives no application credentials. Runtime preview egress is allowed so real websites can load public fonts, images, CDNs, and embeds.

## Environment

See `.env.example`. `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID` are required only when running imported repositories in Vercel Sandbox. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are recommended for production rate limiting; use `ALLOW_IN_MEMORY_RATE_LIMIT="true"` only for a single trusted instance.

### Local review provider

For API-key-free experiments, keep `DESIGN_REVIEW_PROVIDER="mock"`. To test real provider plumbing against a local or proxy server, run any OpenAI-compatible `/chat/completions` endpoint and set:

```bash
DESIGN_REVIEW_PROVIDER="local"
LOCAL_AI_BASE_URL="http://localhost:11434/v1"
LOCAL_AI_MODEL="your-model"
LOCAL_AI_API_KEY=""
```

Do not point this at cached Codex or ChatGPT session tokens. Destoc only supports explicit provider endpoints and explicit env-provided credentials.

If you want to experiment with a local command bridge, Destoc can invoke an explicit command and parse JSON from stdout:

```bash
DESIGN_REVIEW_PROVIDER="command"
COMMAND_AI_BIN="codex"
COMMAND_AI_ARGS='["exec","--model","gpt-5.4","-c","model_reasoning_effort=\"medium\"","--sandbox","read-only","--color","never","--ephemeral","-"]'
COMMAND_AI_TIMEOUT_MS="120000"
```

This path relies on your local CLI being authenticated already. It does not inspect or copy cached Codex credentials, and it is disabled in production unless `ALLOW_COMMAND_REVIEW_PROVIDER="true"` is set.
The example pins Destoc to `gpt-5.4` with medium reasoning without changing your Codex CLI defaults.

## Current limitations

- The deterministic mock provider remains the safest free default. Local OpenAI-compatible and command providers are available for experiments, and the DeepSeek provider boundary exists, but the production DeepSeek integration is not yet implemented.
- Only common public Next.js/Vite-style repositories are in scope. Private repositories, GitHub OAuth, GitHub write-back/PRs, webhooks, and scheduled reviews are deferred.
- Accepted changes apply to the currently running sandbox only. A new sandbox session intentionally starts from clean repository source.
- `ai-transcripts/` contains the assignment transcript summary package; raw tool exports can be added there after redaction.
