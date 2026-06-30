export type RepositoryPackageManifest = {
  scripts?: Record<string, unknown>;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  packageManager?: unknown;
  workspaces?: unknown;
};

export type PreviewCapability = {
  supported: boolean;
  framework: "next" | "generic";
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  reason?: string;
};

function packageManagerName(value: unknown): PreviewCapability["packageManager"] {
  if (typeof value !== "string") return undefined;
  const name = value.split("@", 1)[0];
  return name === "npm" || name === "pnpm" || name === "yarn" || name === "bun"
    ? name
    : undefined;
}

function hasScript(scripts: Record<string, unknown>, name: string) {
  return typeof scripts[name] === "string" && scripts[name].trim().length > 0;
}

/**
 * Fast, deterministic import-time compatibility check. Runtime checks remain
 * in the sandbox because a repository can change after it is connected.
 */
export function assessRepositoryPreviewCapability(
  manifest: RepositoryPackageManifest,
): PreviewCapability {
  const scripts = manifest.scripts ?? {};
  const dependencies = manifest.dependencies ?? {};
  const devDependencies = manifest.devDependencies ?? {};
  const isNext = typeof dependencies.next === "string" || typeof devDependencies.next === "string";
  const packageManager = packageManagerName(manifest.packageManager);

  if (isNext && (!hasScript(scripts, "build") || !hasScript(scripts, "start"))) {
    return {
      supported: false,
      framework: "next",
      packageManager,
      reason: "This Next.js repository must define build and start scripts before Destoc can create a production preview.",
    };
  }

  if (!isNext && !hasScript(scripts, "dev") && !hasScript(scripts, "start")) {
    const workspaceHint = manifest.workspaces
      ? " Destoc does not yet select an application from a workspace-only monorepo."
      : "";
    return {
      supported: false,
      framework: "generic",
      packageManager,
      reason: `This repository must define a dev or start script for an interactive web preview.${workspaceHint}`,
    };
  }

  return {
    supported: true,
    framework: isNext ? "next" : "generic",
    packageManager,
  };
}
