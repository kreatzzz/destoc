# Codex Session 3

This is a curated implementation record covering production hardening and final
submission preparation. It is not presented as a raw transcript. Secrets,
device codes, provider credentials, database URLs, and private identifiers are
intentionally excluded.

## Prompt and work log

### Durable production execution

- Moved sandbox startup, AI review generation, and accepted patch application to Redis-backed BullMQ jobs.
- Added a dedicated worker process, graceful shutdown, bounded queue retention, deterministic job IDs, and stalled-job recovery.
- Updated the workspace to poll persisted review and revision state rather than waiting on long HTTP requests.
- Prepared separate Coolify web and worker roles from one Docker image.

### Production Codex

- Installed a pinned Codex CLI in the production image.
- Added persistent `CODEX_HOME` support for worker device authentication.
- Kept the application-specific model and reasoning configuration separate from Codex CLI defaults.
- Added the explicit production command-provider enable boundary.
- Added `--skip-git-repo-check` automatically because the worker application directory is not an imported Git repository.

### Repository compatibility

- Extracted import-time capability diagnostics.
- Added actionable rejection for incomplete Next.js projects and workspace-only monorepos.
- Added npm, pnpm, Yarn, and Bun detection through declared package manager and lockfiles.
- Preserved the detected package manager through install, build, start, and accepted-change rebuilds.

### Production deployment diagnosis

- Diagnosed an unstyled production deployment as missing Next.js standalone static/public assets.
- Updated the Docker image to copy `.next/static` and `public` into the standalone server tree.
- Added image-build assertions for required production assets.
- Documented the Coolify web/worker/PostgreSQL/Redis topology and Codex authentication sequence.

### Review-cost controls

- Limited prompts and selected component notes to 100 words.
- Added a compact live word counter and cost explanation tooltip.
- Enforced the same boundary in the API so the UI limit cannot be bypassed.

### Accepted-patch consistency

- Traced a state where a patch was reported ready while the visible sandbox could remain stale.
- Changed accepted revisions to stop the previous app and preview bridge, rebuild when required, restart every supported preview, probe the new bridge, and only then mark the revision ready.
- Added cache-busted iframe reloads, no-store proxy behavior, and service-worker/cache cleanup.

### Submission documentation

- Reworked the README around the evaluator’s product flow.
- Added detailed architecture, assumptions, trade-offs, supported repository scope, and a submission checklist.
- Reconciled the AI usage summary, design document, changelog, and transcript index.

## Verification performed

- TypeScript checks
- ESLint
- Vitest regression suite
- Next.js production build
- Docker image and worker startup checks during the production-deployment phase
- Direct HTTP diagnosis of deployed static assets

## Manual review note

The linked Notion assignment page was unavailable during the final documentation pass. The repository includes a best-effort checklist derived from the selected Mini AI Design Mode direction and the implementation history. The exact submission fields should be compared with an exported or pasted copy of the brief before sending.
