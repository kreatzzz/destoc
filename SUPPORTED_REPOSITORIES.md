# Supported repositories

## Compatibility contract

Destoc currently accepts a repository when all of the following are true:

- The URL is a public `https://github.com/owner/repository` URL.
- The selected branch exists.
- A valid `package.json` exists at the repository root.
- The web application lives at the repository root.
- Dependencies install non-interactively from public registries.
- The application can run without required secrets that have not been supplied.

## Preview and edit compatibility

### Next.js

- `next` appears in dependencies or dev dependencies.
- Root scripts include both `build` and `start`.
- The production build succeeds in Node 24.
- The application binds to port 3000 when started with host/port arguments.
- Editable UI files live in `app/**`, `pages/**`, `components/**`,
  `styles/**`, or the equivalent directories below `src/`.

### Vite

- Root scripts include `dev` or `start`.
- The script accepts `--host 0.0.0.0 --port 3000`.
- The project does not require a private API or package registry to render its primary page.
- Common entry files such as `src/App.tsx`, `src/main.tsx`, and
  `src/index.css` are editable. Source mapping remains best-effort.

## Package managers

Destoc detects and preserves:

- npm through `package-lock.json`
- pnpm through `pnpm-lock.yaml`
- Yarn through `yarn.lock`
- Bun through `bun.lock` or `bun.lockb`
- A valid `packageManager` field takes precedence

The detected manager is used for install, build, start, and accepted-change rebuilds.

## Best repositories to test

Use small public UI projects with:

- A root Next.js or Vite application.
- Static or public data.
- No authentication requirement.
- No mandatory environment variables.
- No private packages.
- A conventional landing page or component gallery with visible text and styles.

For the most predictable end-to-end test, use a minimal root-level
`create-next-app` App Router project with conventional `app/**` and
`components/**` source files plus `dev`, `build`, and `start` scripts. A
standard React/Vite repository is also previewable and its common entry files
are patch-eligible, but source-to-DOM mapping is less deterministic.

## Experimental compatibility

Astro, Create React App, Remix, Parcel, and custom Node web servers may work when their root script accepts the host and port arguments Destoc supplies. They are not as thoroughly verified as Next.js and Vite.

## Not supported

- Private GitHub repositories.
- GitLab, Bitbucket, archives, or local folders.
- Workspace-only monorepos where the runnable app is below the root.
- Static HTML repositories without `package.json`.
- Repositories requiring interactive installation.
- Private package registries.
- Native desktop/mobile applications.
- Backend-only services without a browser interface.
- Projects that require unavailable secrets or internal network services.
- Applications that cannot bind to ports 3000, 5173, 4173, 4321, or 8080.

## Patch scope

Generated patches are intentionally constrained to UI-oriented source paths:
`app`, `pages`, `components`, `styles`, `data`, `content`, and `lib`, with or
without a `src/` prefix, plus common Vite entry files. Package manifests,
lockfiles, environment files, and unsafe traversal paths cannot be changed.
Large architectural migrations are not a reliable use case for the current
source mapper.

## GitHub API limit

Repository metadata and source-context requests are currently anonymous. A
busy deployment can hit GitHub's unauthenticated API rate limit even when every
repository is public. The evaluator should use a small number of imports, or
the application should gain an optional server-side GitHub token before wider
use.
