# AI Usage Summary

## AI tool used

- Codex

## Supporting references and feedback tools

- Agentation-style page feedback annotations
- Notion assignment reference
- shadcn/ui component references

Cursor and OpenCode were not used.

## What AI helped with

- Initial architecture and stack planning for the Mini AI Design Mode submission.
- Next.js, Prisma, PostgreSQL, Better Auth, Tailwind, shadcn/ui, and Bun foundation work.
- Public GitHub repository import flow and repository compatibility checks.
- Vercel Sandbox preview lifecycle, isolated repository execution, restart/stop controls, and preview bridge behavior.
- Component selection, component notes, chat prompt context, suggestion generation, accept/reject decisions, and live sandbox patch application.
- Workspace UI iteration, including the repository dashboard, design workspace, chat rail, diff pane, and toolbar interactions.
- Landing-page visibility, session-aware authentication links, system-prompt design, and user-facing streamed review summaries.
- Error handling, rate limiting, environment documentation, Docker/Coolify deployment support, and validation commands.
- BullMQ worker architecture, production Codex handling, repository compatibility diagnostics, and accepted-preview consistency hardening.

## Important manual decisions

- Chose Option 2 from the assignment: Mini AI Design Mode.
- Chose Next.js App Router, TypeScript, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui, Better Auth, and Bun.
- Scoped authentication to email and password for the v1.
- Scoped repository import to public GitHub repositories.
- Kept repository execution isolated in Vercel Sandbox instead of running untrusted code on the application host.
- Decided that each new sandbox session should start fresh from repository source instead of replaying accepted changes from older sessions.
- Deferred GitHub write-back, pull requests, private repositories, scheduled reviews, and the final production DeepSeek integration.

## Known limitations

- The current private production experiment uses an authenticated Codex CLI
  worker. DeepSeek remains a future provider option.
- Next.js previews expect a root `package.json` with runnable `build` and `start` scripts; other supported root web repositories need `dev` or `start`.
- Accepted patches apply to the currently running sandbox only; new sessions intentionally start from clean repository source.
- Code patching is best-effort and limited to safe UI/source paths.
- The command provider is deployed for a private experiment, but device authentication can expire and it should not be treated as a shared multi-tenant AI gateway.
- The checked-in transcript artifact is a selected copied/redacted excerpt plus
  curated records, not an unsafe full export of a thread that contained
  credentials.
