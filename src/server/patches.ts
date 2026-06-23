import { AppError } from "@/lib/errors";

const allowedUiPath = /^src\/(app|components)\/.+\.(?:tsx|jsx|css)$/;
const forbiddenPathSegment = /(^|\/)(?:\.git|node_modules|\.env(?:\.|$)|package(?:-lock)?\.json|bun\.lockb?|pnpm-lock\.yaml|yarn\.lock)(?:\/|$)/;

function extractPatchPaths(patch: string): string[] {
  const paths = patch
    .split("\n")
    .filter((line) => line.startsWith("+++ b/"))
    .map((line) => line.slice("+++ b/".length).trim());

  if (paths.length === 0) {
    throw new AppError("VALIDATION_ERROR", "A patch must use unified-diff file headers.");
  }

  return paths;
}

export function assertPatchIsAllowed(patch: string, expectedSourceFilePath?: string): void {
  if (!patch.trim()) throw new AppError("VALIDATION_ERROR", "A suggested patch cannot be empty.");
  if (patch.length > 20_000) throw new AppError("VALIDATION_ERROR", "Suggested patch is too large.");

  const paths = extractPatchPaths(patch);
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
