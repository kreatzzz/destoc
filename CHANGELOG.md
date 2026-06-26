# Changelog

All notable project decisions and changes are recorded here.

## Unreleased

### Added

- Project operating guidance in `AGENTS.md`.
- Task tracking in `TODOS.md`.
- Explicit scope for the first implementation: email/password auth, public repository URL import, sandbox-only revisions, and a deterministic review provider.
- Next.js App Router workspace with Better Auth, Prisma 7/PostgreSQL persistence, shadcn UI primitives, and Bun scripts.
- Project, sandbox-run, review target, review, suggestion, revision, and asset domain models with server-side ownership checks.
- Public GitHub URL validation, safe patch-path validation, structured mock design-review provider, API routes, and production rate-limit policy.
- Three-pane design workspace inspired by developer review tools, plus sign-in/sign-up, workspace onboarding, project import, loading, empty, and error states.
- Vitest coverage for GitHub source validation, selected-element payload bounds, and patch safety.
- Docker Compose PostgreSQL development service, initial Prisma migration, and automatic `.env` loading for Prisma commands and seeds.
- A visible destructive project deletion action that removes only Destoc-owned project data, never the GitHub repository.
- Local OpenAI-compatible design review provider support for experiments without DeepSeek API usage.

### Changed

- Sandbox preview startup now permits required dependency lifecycle scripts inside the disposable VM, waits up to one minute for the server, and persists detached-server logs on failure.
- Repository import now accepts the seeded demo workspace ID; ownership enforcement remains the authorization boundary.
- Workspace status now distinguishes a stopped preview from a live one.
- Preview sessions now remain available for the maximum Hobby-safe runtime, recover stalled viewport motion in isolated previews, and provide working iframe reload and fullscreen controls.
- A stale or expired preview can now be restarted directly from the preview toolbar.
- Next.js repositories now use a built production preview, with a constrained public-host allowlist for fonts and common embeds; motion fallbacks no longer override continuous transforms such as marquees.
- Preview refresh now probes sandbox liveness server-side, marks expired 410/404 previews as stopped, and avoids reloading dead iframe URLs.
- The workspace now defaults to Inspect mode so source-site animations run naturally until Design Mode is explicitly enabled.
- Sandbox startup now rejects non-web repositories without `npm run dev` or `npm run start` before dependency installation.
- Workspace toolbar, rail, and inspector buttons now use shadcn tooltips; Select/Inspect, Page Audit, Settings, Activity, Reload, Restart, and Fullscreen controls have real behavior.
- Sandbox startup now queues immediately and reports progress through polling instead of blocking the UI while install/build/start runs.
- Stopped previews now auto-retry when a project opens, while failed non-web repositories remain failed with their actionable error.
- The workspace has been simplified to a left chat/context rail and a full-space preview, removing the old project navigation, right inspector, top Design Mode toggle, preview card chrome, and suggestions badge.
- Component selections now accumulate as pills above the chat box and are sent as context with chat-driven review prompts.
- Workspace branding now uses a compact `D.` wordmark and a warmer golden accent palette instead of the previous acid green.
- The workspace logo now renders as a minimal yellow wordmark without a containing badge.
- The workspace index now uses a denser project dashboard with status summaries, polished import surfaces, and icon-only project deletion.
- The workspace index hero now removes the workspace-name eyebrow and boxy rounded/overflow card treatment per design feedback.

### Deferred

- DeepSeek is the intended live provider but will be connected after the provider contract and core product are stable.
- `DESIGN.md` is intentionally postponed until the core implementation is complete.
