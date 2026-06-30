# Submission checklist

This checklist maps the repository to the linked 11auction Mini AI Design Mode
brief.

## Links

- [Live application](https://destoc.cooldash.xyz)
- [GitHub repository](https://github.com/kreatzzz/destoc)

## Product deliverable

- [x] Page/component review interface.
- [x] AI-generated design feedback.
- [ ] Persisted visual before/after view.
- [x] Accept or reject suggestions.
- [x] Basic code/CSS output through bounded unified diffs.
- [x] Clean visual desktop interface.
- [x] Email/password authentication.
- [x] Public GitHub repository import.
- [x] Isolated live web preview.
- [x] Component selection and numbered markers.
- [x] Per-component feedback notes.
- [x] AI design-review prompt flow.
- [x] Code-backed suggestions and diff pane.
- [x] Accept/reject interaction.
- [x] Sandbox-only patch, rebuild, restart, and verification implementation.
- [x] Loading, empty, failed, stopped, and retry states.
- [x] Repository disconnect/delete action.

## Engineering deliverable

- [x] Next.js/TypeScript application.
- [x] PostgreSQL/Prisma persistence.
- [x] Better Auth ownership boundary.
- [x] Redis/BullMQ worker.
- [x] Rate limiting and consistent route errors.
- [x] Vercel Sandbox isolation.
- [x] Docker/Coolify deployment configuration.
- [x] Unit tests, type checking, linting, and production build.

## Documentation deliverable

- [x] Local setup and verification commands in `README.md`.
- [x] Architecture, assumptions, security boundaries, and trade-offs in `ARCHITECTURE.md`.
- [x] Production deployment in `DEPLOYMENT.md`.
- [x] Supported repository matrix in `SUPPORTED_REPOSITORIES.md`.
- [x] Design system in `DESIGN.md`.
- [x] Honest Codex usage summary and curated implementation records in
  `ai-transcripts/`.
- [x] Selected copied, secret-redacted Codex chat excerpts.
- [x] Continuous implementation history in `CHANGELOG.md`.
- [x] Remaining scope in `TODOS.md`.

## Manual checks before sending

- [ ] Force-rebuild and deploy web and worker from the final commit.
- [ ] Confirm production CSS/JavaScript assets return HTTP 200.
- [ ] Confirm Redis, worker, and PostgreSQL are healthy.
- [ ] Confirm Codex device authentication persists in `/data/codex`.
- [ ] Import a clean root-level Next.js App Router test repository.
- [ ] Complete one select → prompt → accept → verified-preview cycle.
- [ ] Remove or rotate any credentials exposed during development.

## Brief compliance notes

- Hosted access uses self-serve sign-up as the documented demo flow.
- Desktop-only polish is acceptable under the brief; the manager and landing
  page still include basic narrow-screen behavior.
- The required before/after feature is the remaining Option 2 gap. Code diffs
  and a live patched preview exist, but persisted screenshot comparison does
  not.
- Basic concurrent use is addressed with BullMQ, a one-worker default, durable
  database state, deterministic job IDs, and rejection of simultaneous
  accepted revisions on one preview.
