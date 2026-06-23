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

### Deferred

- DeepSeek is the intended live provider but will be connected after the provider contract and core product are stable.
- `DESIGN.md` is intentionally postponed until the core implementation is complete.
