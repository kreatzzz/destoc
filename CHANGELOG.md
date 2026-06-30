# Changelog

All notable project decisions and changes are recorded here.

## Unreleased

### Added

- A reusable evidence-bound design-review system prompt that encodes implementation-first interface rules, accessibility constraints, safe patch behavior, and honest user-facing summaries.
- A second curated Codex transcript covering sandbox hydration, workspace-manager, landing-page, and chatbot refinements.
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
- Local OpenAI-compatible and explicit command design review provider support for experiments without DeepSeek API usage.

### Changed

- Repository rows now include an icon-only delete action with a shadcn confirmation dialog, pending state, inline failure feedback, and automatic list refresh.
- The landing page now uses a lighter directional vignette, a Geist hero heading, session-aware authentication actions, and a combined top-left `D.`/Destoc wordmark while preserving the pixel-art visual direction.
- Chat review completions now type out the provider’s user-facing summary, and accepted-change messages identify the applied change and sandbox rebuild instead of returning generic status copy.
- The code-changes pane now has a centered workflow-oriented empty state with an animated file-edit icon.
- The workspace manager now uses a compact Vercel-like shell with a thin navigation bar, dense repository rows, restrained radii, explicit dividers, and a focused import panel that adapts cleanly to narrow screens.
- Next.js sandbox previews now build and run in production mode so failed development HMR WebSockets cannot block React hydration, interactions, or animation effects; accepted changes rebuild and restart the production preview automatically.
- Preview media recovery is now limited to near-viewport lazy images after the page load event and no longer overrides repository opacity, filter, or fetch-priority behavior.
- Agentation is visible in development by default again, and the Next.js dev indicator is restored for local project feedback.
- The preview bridge now injects the design-mode bridge through a streaming transform instead of buffering full HTML, improving reliability for streaming and client-heavy pages.
- Stalled entrance-motion elements are recovered in normal preview mode as well as design mode, while continuous transforms such as marquees remain untouched.
- Workspace chat now uses the shadcn chat primitives as a single ordered timeline: `MessageScroller` receives stable message IDs and auto-scroll settings, suggestions are attached to the assistant turn that created them, and suggestion cards are reduced to compact diff actions.
- Project workspaces now open as fresh chat/review sessions: persisted historical suggestions are not hydrated back into the live chat or code pane, and the initial instructional assistant bubble has been removed.
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
- The workspace index now uses a minimal colored/padded project count strip and removes extra explanatory copy.
- The command review provider example now pins Destoc to `gpt-5.4` with medium reasoning, and workspace chat surfaces use concentric rounding.
- Fixed the local command review provider config for the current Codex CLI, captured Codex final output via `--output-last-message`, and wired selected component notes into review prompts including notes-only sends.
- Review prompts now request implementation-first suggestions with optional unified diffs, include repository evidence, and render patch-aware accept/reject cards in the workspace chat.
- Review generation now fetches bounded public GitHub source candidates so providers can draft real diffs instead of source-missing advice; workspace chat is simplified and code changes live in a collapsible right pane.
- Workspace top bar now includes restart/stop sandbox controls and a code-changes pane toggle.
- Added a deterministic selected-text replacement fallback for simple copy edits, made the code pane show code diffs only, added an animated drafting bubble, and clear selected components immediately after prompt submission.
- Workspace chat and code-diff panes are now horizontally resizable, and the code pane opens/closes with an interruptible width/opacity transition while the center sandbox preview flexes responsively.
- Added Coolify-friendly Docker deployment support with standalone Next.js output, startup Prisma migrations, a container health endpoint, `.dockerignore`, and a deployment runbook.
- Production rate limiting now supports an explicit single-instance home-server fallback via `ALLOW_IN_MEMORY_RATE_LIMIT`; Upstash remains the recommended distributed limiter.
- Suggestion decisions now live in compact chat cards while the code pane shows only diffs; accepting a suggestion applies its patch to the running sandbox and reloads the preview when ready.
- Accepted patches now tolerate fenced/malformed provider diffs with `git apply --recount` plus an exact-block fallback, and multi-component selections now use stable local IDs for pills, notes, and removal.
- Repository import now verifies public GitHub repository and branch existence, code changes no longer auto-open, accepted patches apply to the running sandbox, `/workspace` uses logout instead of project deletion, chat surfaces are more minimal, invalid provider diffs are rejected before accept, direct multi-component text notes produce one combined patch, and `DESIGN.md` defines the Destoc design system.
- Suggestion acceptance now marks suggestions as accepted only after the sandbox patch applies successfully; failed patch applications leave suggestions retryable.
- The project-detail workspace header now uses logout instead of a delete-project icon, matching the workspace index behavior.
- Workspace chat now uses the new shadcn `MessageScroller`, `Message`, and `Bubble` primitives, adds the related shadcn chat primitives to the UI library, and applies the Mobbin-backed direction of quiet rails, compact cards, and a stronger composer surface.
- Workspace shell now groups repository content in a warm tinted panel, rounds the connected-project summary, aligns top-bar icons with animated lucide icons, and compacts chat/update surfaces.
- Workspace chat now separates user and Destoc messages more clearly, removes accepted checkmark confirmation cards, streams acceptance/completion text, and keeps accepted diffs across prompts.
- Sandbox previews now require an editable `dev` script, use clearer incompatible-repository errors, and allow public runtime egress so external assets can render.
- Failed patch applications now return suggestions to a retryable state instead of leaving them visually accepted.
- Added the assignment `ai-transcripts/` package with an AI usage summary, curated Codex session notes, Cursor/page-feedback notes, and OpenCode link placeholder.
- The `/workspace` repository dashboard now uses a more structured warm container system around the existing content without changing the page copy.
- New sandbox sessions now start fresh from repository source instead of replaying older accepted patches, avoiding stale patch carryover and white-screen regressions.
- Sandbox preview startup now runs dev servers with explicit development-mode environment settings and faster npm install flags.
- Ready previews that become unreachable are marked stopped so the workspace can automatically queue a fresh preview instead of keeping a dead iframe.
- The sandbox preview bridge now eagerly normalizes lazy media to load images, iframes, video, and source assets earlier while observing newly inserted media.
- The sandbox motion fallback now preserves element transforms so continuous animations such as marquees keep running.
- Fresh workspace chat sessions now center the composer with a minimal heading and animate it back into the bottom composer position once conversation state exists.
- Workspace chat no longer renders an empty selected-component spacer when no components are attached.

### Deferred

- DeepSeek is the intended live provider but will be connected after the provider contract and core product are stable.
