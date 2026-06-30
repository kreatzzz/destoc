# Coolify deployment on Oracle Cloud

Destoc deploys as two applications from the same Dockerfile and Git commit:

- `destoc-web`: the public Next.js application (`PROCESS_ROLE=web`)
- `destoc-worker`: the private BullMQ worker (`PROCESS_ROLE=worker`)

Both use the same PostgreSQL database and Redis instance. Sandbox startup, AI review generation, and accepted patch application run on the worker rather than inside web requests.

## 1. Prepare the Oracle VPS

Before deploying:

1. Confirm the VPS architecture is supported by the Docker image (`amd64` or `arm64`).
2. Keep Coolify, PostgreSQL, Redis, the web container, and one worker within available RAM. Oracle free instances are small; start with one worker and `WORKER_CONCURRENCY=1`.
3. Configure a DNS `A` record for the app domain to the VPS public IP.
4. Allow inbound `80` and `443` in both the Oracle network security rules and the host firewall.
5. Do not expose PostgreSQL or Redis ports publicly.

## 2. Create PostgreSQL and Redis

In one Coolify project:

1. Create a PostgreSQL resource and copy its internal connection URL.
2. Create a Redis resource with persistence enabled.
3. Configure Redis with:

```text
appendonly yes
maxmemory-policy noeviction
```

4. Copy the internal Redis URL. Use the private Coolify service hostname, not the VPS public IP.

The Redis instance used by BullMQ is separate from the optional Upstash REST rate limiter. One Redis service cannot be addressed through Upstash REST environment variables.

## 3. Create the web application

Create an application from this repository:

- Build pack: Dockerfile
- Dockerfile: `/Dockerfile`
- Port: `3000`
- Domain: your HTTPS Destoc domain
- Health check path: `/api/health`
- Environment: `PROCESS_ROLE=web`

Set:

```bash
NODE_ENV=production
PORT=3000
PROCESS_ROLE=web

DATABASE_URL=postgresql://...
REDIS_URL=redis://...
QUEUE_PREFIX=destoc-production
WORKER_CONCURRENCY=1

BETTER_AUTH_SECRET=<openssl-rand-base64-32>
BETTER_AUTH_URL=https://destoc.example.com

ALLOW_IN_MEMORY_RATE_LIMIT=true
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

VERCEL_TOKEN=...
VERCEL_TEAM_ID=...
VERCEL_PROJECT_ID=...

DESIGN_REVIEW_PROVIDER=command
ALLOW_COMMAND_REVIEW_PROVIDER=true
COMMAND_AI_BIN=codex
COMMAND_AI_ARGS=["exec","--model","gpt-5.4","-c","model_reasoning_effort=\"medium\"","--sandbox","read-only","--color","never","--ephemeral","-"]
COMMAND_AI_TIMEOUT_MS=300000
```

The web service needs the provider variables because it validates provider configuration before enqueueing a review. It does not execute Codex.

`ALLOW_IN_MEMORY_RATE_LIMIT=true` is acceptable for one web replica. If you scale the web service, configure Upstash and set it to `false`.

## 4. Create the worker application

Create a second application from the same repository and commit:

- Build pack: Dockerfile
- Dockerfile: `/Dockerfile`
- No public domain
- Environment: `PROCESS_ROLE=worker`
- Replica count: `1`

Copy the same database, Redis, Better Auth, Vercel Sandbox, queue, and provider variables used by the web application. Then add:

```bash
PROCESS_ROLE=worker
WORKER_CONCURRENCY=1
CODEX_HOME=/data/codex
```

Attach a persistent Coolify volume:

```text
/data/codex
```

The worker is where Codex executes, so the persistent volume belongs to the worker. Keep one worker while using a personal Codex session and while operating within Oracle free-tier memory limits.

## 5. Authenticate Codex in the worker

The image installs the pinned Codex CLI during its Docker build. There are two supported deployment paths in this repository.

### Device login, matching the localhost experiment

1. Temporarily deploy the worker with `DESIGN_REVIEW_PROVIDER=mock` so it can start before authentication.
2. Open a terminal in the running worker container.
3. Run:

```bash
codex login --device-auth
```

4. Complete the browser flow.
5. Confirm that `/data/codex/auth.json` exists in the persistent volume.
6. Change the worker and web provider to `command`, set `ALLOW_COMMAND_REVIEW_PROVIDER=true`, and redeploy both.

This carries the local command-provider implementation into production. The login survives worker redeploys only because `/data/codex` is persistent.

### API key

Set `OPENAI_API_KEY` on the worker. The startup script logs the CLI in non-interactively before starting BullMQ. Do not set this secret on the public web application because it does not execute reviews.

## 6. Deploy in order

1. Deploy PostgreSQL and Redis and wait for both to become healthy.
2. Deploy `destoc-web`.
3. Deploy `destoc-worker`.
4. Check worker logs for `Destoc worker ready with concurrency 1`.
5. Open `/api/health` on the public domain.
6. Create an account and import a small public Next.js or Vite repository.
7. Start a preview and verify the status moves through queued, provisioning, building, and ready.
8. Send a review prompt and verify the worker runs a `review.execute` job.
9. Accept a generated patch and verify a `revision.apply` job rebuilds and refreshes the preview.

## 7. Operational notes

- Web and worker must use the same `DATABASE_URL`, `REDIS_URL`, and `QUEUE_PREFIX`.
- Deploy web and worker from the same commit when queue payloads change.
- The worker retries jobs that BullMQ detects as stalled. Domain state is persisted in PostgreSQL so the UI can poll safely after an HTTP request returns.
- Completed queue metadata is retained for one hour (up to 100 jobs); failed metadata is retained for 24 hours (up to 500 jobs).
- New sandbox sessions intentionally start from clean repository source.
- Vercel Sandbox remains required for untrusted repository execution. The Oracle VPS runs Destoc and its worker, not imported project code.
- DeepSeek remains a placeholder. Keep the command provider or mock provider until that integration is implemented.

## Codex production difficulty

For a private experimental deployment, this is moderate rather than difficult: the image includes Codex, reviews execute in the worker, and authentication persists in one mounted directory. The brittle part is session-based device authentication: it may expire and requires re-running the login command. An API key is easier to operate. This setup should not be treated as a shared multi-tenant Codex gateway; restrict who can create accounts and monitor worker resource usage.
