# TODOS.md

## In progress

- No code-only tasks are currently in progress. The remaining items require provider credentials, product scope, or additional infrastructure.

## Deliberately deferred

- [ ] DeepSeek runtime provider configuration and live AI generation.
- [ ] Per-project runtime host/environment allowlists for previews that depend on third-party services.
- [ ] Persisted before/after screenshot capture; this requires a production browser-capture service and configured Blob storage.
- [ ] GitHub OAuth, private repositories, GitHub writes, pull requests, webhooks, and scheduled reviews.
- [ ] Full remote preview bridge and production Vercel Sandbox wiring where credentials are unavailable locally.
- [ ] `DESIGN.md`, to be created after core implementation using google-labs-code/design.md.

## Done

- [x] Define the initial product boundary and core architecture.
- [x] Bootstrap the Bun, Next.js, TypeScript, Tailwind, shadcn, Prisma, and Better Auth foundation.
- [x] Implement authenticated ownership, persistent project/review/revision models, and seeded demo data.
- [x] Implement public repository validation, sandbox lifecycle APIs, mock reviews, patch restrictions, and persisted decisions.
- [x] Build the desktop three-pane workspace, lightweight auth entry flow, loading/empty/error states, rate limits, tests, and environment documentation.
- [x] Provide a local Docker PostgreSQL service, committed initial migration, and seedable demo account.
- [x] Add liveness-aware sandbox reload/restart behavior, production Next.js previews, tooltips, and functional workspace controls.
- [x] Replace the three-pane workspace with chat/context pills plus full-space preview and async sandbox progress polling.
- [x] Add the assignment `ai-transcripts/` package with AI usage summary and curated session notes.
- [x] Make new sandbox sessions start fresh from repository source instead of replaying older accepted patches.
- [x] Move sandbox execution, AI review generation, and accepted patch application to a BullMQ worker backed by Redis.
- [x] Add a two-service Coolify deployment path with persistent production Codex authentication on the worker.
- [x] Add an import-time repository capability scanner with Next.js, generic web-script, package-manager, and workspace-only monorepo diagnostics.
- [x] Run imported npm, pnpm, Yarn, and Bun projects through their declared package manager during install, build, start, and revision rebuilds.
