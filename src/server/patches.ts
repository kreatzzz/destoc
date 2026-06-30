import { AppError } from "@/lib/errors";

const allowedUiPath = /^(?:(?:src\/)?(?:app|pages|components|data|content|lib|styles)\/.+|src\/(?:App|main|index)|(?:App|main|index))\.(?:tsx|jsx|ts|js|css|json|mdx?)$/;
const forbiddenPathSegment = /(^|\/)(?:\.git|node_modules|\.env(?:\.|$)|package(?:-lock)?\.json|bun\.lockb?|pnpm-lock\.yaml|yarn\.lock)(?:\/|$)/;

export function normalizeUnifiedDiff(patch: string): string {
  const trimmed = patch.trim();
  const fenced = trimmed.match(/^```(?:diff|patch)?\s*\n([\s\S]*?)\n```$/i);
  return `${(fenced?.[1] ?? trimmed).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd()}\n`;
}

function parsePatchPaths(patch: string): string[] {
  const lines = normalizeUnifiedDiff(patch).split("\n");
  const paths: string[] = [];
  let index = 0;
  let activeFile: string | null = null;
  let hunkHasChange = false;
  let fileHasHunk = false;

  function finishFile() {
    if (activeFile && !fileHasHunk) {
      throw new AppError("VALIDATION_ERROR", "A patch file section must include at least one hunk.");
    }
  }

  while (index < lines.length) {
    const line = lines[index]!;
    if (!line || line.startsWith("diff --git ") || line.startsWith("index ")) {
      index += 1;
      continue;
    }

    if (!line.startsWith("--- a/")) {
      throw new AppError("VALIDATION_ERROR", "A patch must use unified-diff file headers.");
    }

    finishFile();
    activeFile = null;
    fileHasHunk = false;
    hunkHasChange = false;

    const oldPath = line.slice("--- a/".length).trim();
    const nextLine = lines[index + 1];
    if (!nextLine?.startsWith("+++ b/")) {
      throw new AppError("VALIDATION_ERROR", "A patch must include both old and new file headers.");
    }

    const newPath = nextLine.slice("+++ b/".length).trim();
    if (!newPath || oldPath !== newPath) {
      throw new AppError("VALIDATION_ERROR", "A patch must modify the same file in old and new headers.");
    }

    paths.push(newPath);
    activeFile = newPath;
    index += 2;

    while (index < lines.length) {
      const hunkLine = lines[index]!;
      if (!hunkLine) {
        index += 1;
        continue;
      }
      if (hunkLine.startsWith("--- a/") || hunkLine.startsWith("diff --git ")) break;
      if (!hunkLine.startsWith("@@")) {
        throw new AppError("VALIDATION_ERROR", "A patch hunk must start with @@.");
      }

      fileHasHunk = true;
      hunkHasChange = false;
      index += 1;

      while (index < lines.length) {
        const bodyLine = lines[index]!;
        if (
          bodyLine.startsWith("@@") ||
          bodyLine.startsWith("--- a/") ||
          bodyLine.startsWith("diff --git ")
        ) {
          break;
        }
        if (bodyLine === "") {
          // A blank removed/added/context source line must still be prefixed.
          // An unprefixed blank in provider output is treated as hunk spacing.
          index += 1;
          continue;
        }
        if (bodyLine.startsWith("\\ No newline at end of file")) {
          index += 1;
          continue;
        }
        if (!bodyLine.startsWith(" ") && !bodyLine.startsWith("+") && !bodyLine.startsWith("-")) {
          throw new AppError("VALIDATION_ERROR", "A patch hunk contains an unprefixed source line.");
        }
        if (bodyLine.startsWith("+") || bodyLine.startsWith("-")) hunkHasChange = true;
        index += 1;
      }

      if (!hunkHasChange) {
        throw new AppError("VALIDATION_ERROR", "A patch hunk must add or remove at least one line.");
      }
    }
  }

  if (paths.length === 0) {
    throw new AppError("VALIDATION_ERROR", "A patch must use unified-diff file headers.");
  }

  finishFile();
  return paths;
}

export function assertPatchIsAllowed(patch: string, expectedSourceFilePath?: string): void {
  if (!patch.trim()) throw new AppError("VALIDATION_ERROR", "A suggested patch cannot be empty.");
  if (patch.length > 20_000) throw new AppError("VALIDATION_ERROR", "Suggested patch is too large.");

  const paths = parsePatchPaths(patch);
  for (const path of paths) {
    if (
      path.startsWith("/") ||
      path.includes("..") ||
      forbiddenPathSegment.test(path) ||
      !allowedUiPath.test(path)
    ) {
      throw new AppError("VALIDATION_ERROR", "Suggested patch modifies a restricted path.");
    }
    if (expectedSourceFilePath && path !== expectedSourceFilePath) {
      throw new AppError("VALIDATION_ERROR", "Suggested patch must only modify the selected source file.");
    }
  }
}
