#!/usr/bin/env bash
set -euo pipefail

role="${PROCESS_ROLE:-web}"

if [[ "$role" != "web" && "$role" != "worker" ]]; then
  echo "PROCESS_ROLE must be either web or worker." >&2
  exit 1
fi

mkdir -p "${CODEX_HOME:-/data/codex}"

echo "Applying database migrations for the ${role} process."
bun run db:deploy

if [[ "$role" == "worker" ]]; then
  if [[ "${DESIGN_REVIEW_PROVIDER:-mock}" == "command" ]]; then
    if ! command -v codex >/dev/null 2>&1; then
      echo "The command review provider is enabled but the Codex CLI is unavailable." >&2
      exit 1
    fi

    if [[ -n "${OPENAI_API_KEY:-}" ]]; then
      printf '%s' "$OPENAI_API_KEY" | codex login --with-api-key >/dev/null
    elif [[ ! -f "${CODEX_HOME:-/data/codex}/auth.json" ]]; then
      echo "Codex is not authenticated. Mount persistent CODEX_HOME storage and run 'codex login --device-auth' in the worker container." >&2
      exit 1
    fi
  fi

  exec bun run worker
fi

exec bun run start
