# Coolify deployment

This repo is ready to deploy on Coolify as a Dockerfile application. The container builds the Next.js production bundle, runs Prisma migrations on startup, then starts the standalone Next.js server on port `3000`.

## Required services

- PostgreSQL database reachable from the application container.
- A public HTTPS domain for Better Auth callback/cookie URLs.
- Optional: Upstash Redis for distributed production rate limiting.
- Optional: Vercel Sandbox credentials for imported-repository previews.

## Coolify setup

1. Push the latest repo changes to GitHub.
2. In Coolify, create or open a project.
3. Add a PostgreSQL resource, or prepare an external PostgreSQL database.
4. Add a new application from the GitHub repository.
5. Choose Dockerfile build mode.
6. Set the Dockerfile path to `/Dockerfile`.
7. Set the exposed port to `3000`.
8. Add the production domain and enable HTTPS.
9. Add the environment variables below.
10. Deploy.

The container health endpoint is:

```text
/api/health
```

## Environment variables

Minimum app variables:

```bash
NODE_ENV="production"
PORT="3000"
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"
BETTER_AUTH_URL="https://your-destoc-domain.com"
DESIGN_REVIEW_PROVIDER="mock"
```

Rate limiting:

```bash
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
ALLOW_IN_MEMORY_RATE_LIMIT="false"
```

Use Upstash for a real multi-instance deployment. For a single home-server instance, you can temporarily set `ALLOW_IN_MEMORY_RATE_LIMIT="true"` to use the same process-local limiter as local development.

Repository preview sandboxing:

```bash
VERCEL_TOKEN=""
VERCEL_TEAM_ID=""
VERCEL_PROJECT_ID=""
```

These are required if you want imported repositories to run in Vercel Sandbox. Coolify hosting does not replace Vercel Sandbox; the app still uses Vercel Sandbox to execute untrusted public repositories away from your home server.

Review providers:

```bash
DESIGN_REVIEW_PROVIDER="mock"
DEEPSEEK_API_KEY=""
LOCAL_AI_BASE_URL="http://host.docker.internal:11434/v1"
LOCAL_AI_API_KEY=""
LOCAL_AI_MODEL="local-model"
COMMAND_AI_BIN="codex"
COMMAND_AI_ARGS='["exec","--model","gpt-5.4","-c","model_reasoning_effort=\"medium\"","--sandbox","read-only","--color","never","--ephemeral","-"]'
COMMAND_AI_TIMEOUT_MS="120000"
ALLOW_COMMAND_REVIEW_PROVIDER="false"
```

Recommended production values today:

- Use `DESIGN_REVIEW_PROVIDER="mock"` for a hosted UI smoke test.
- Use `DESIGN_REVIEW_PROVIDER="local"` if you expose an OpenAI-compatible gateway on your home network.
- Do not use `DESIGN_REVIEW_PROVIDER="deepseek"` until the DeepSeek provider is implemented.
- Do not depend on `DESIGN_REVIEW_PROVIDER="command"` in production unless you intentionally install and authenticate the command inside the server environment.

## First deploy checklist

After deploy:

1. Open `https://your-destoc-domain.com/api/health`.
2. Open the app and create an account.
3. Import a small public web repository.
4. If sandbox credentials are configured, start a preview.
5. Send a review prompt with `DESIGN_REVIEW_PROVIDER="mock"` first.
6. Switch to `local` or DeepSeek only after the base deploy is stable.

## Known hosting limitations

- DeepSeek is not wired yet; setting `DESIGN_REVIEW_PROVIDER="deepseek"` currently fails by design.
- Vercel Sandbox credentials are still required for previewing imported repositories.
- Accepted suggestions are persisted for audit/history and apply to the currently running sandbox only. New sandbox sessions intentionally start from clean repository source.
- The command provider depends on a CLI binary and authenticated session in the runtime container; your local Codex desktop session is not automatically available on Coolify.
