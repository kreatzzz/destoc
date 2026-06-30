# TODOS.md

## In progress

- [ ] Configure a live DeepSeek provider and validate structured reviews against real component evidence.
- [ ] Validate preview startup across more framework/package-manager variants and add persisted screenshot capture.
- [ ] Add a repository capability scanner so non-web imports are flagged before users start a sandbox.
- [ ] Add per-project runtime host/env allowlists for previews that legitimately depend on third-party services.

## Deliberately deferred

- [ ] DeepSeek runtime provider configuration and live AI generation.
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
