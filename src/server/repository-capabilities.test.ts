import { describe, expect, it } from "vitest";

import { assessRepositoryPreviewCapability } from "@/server/repository-capabilities";

describe("assessRepositoryPreviewCapability", () => {
  it("accepts a production-runnable Next.js application", () => {
    expect(assessRepositoryPreviewCapability({
      scripts: { dev: "next dev", build: "next build", start: "next start" },
      dependencies: { next: "16.2.9" },
      packageManager: "bun@1.3.14",
    })).toEqual({
      supported: true,
      framework: "next",
      packageManager: "bun",
    });
  });

  it("rejects Next.js repositories that cannot serve a production build", () => {
    const capability = assessRepositoryPreviewCapability({
      scripts: { dev: "next dev" },
      dependencies: { next: "16.2.9" },
    });

    expect(capability.supported).toBe(false);
    expect(capability.reason).toContain("build and start scripts");
  });

  it("accepts a generic Vite-style development server", () => {
    expect(assessRepositoryPreviewCapability({
      scripts: { dev: "vite" },
      devDependencies: { vite: "7.0.0" },
      packageManager: "pnpm@10.0.0",
    })).toMatchObject({
      supported: true,
      framework: "generic",
      packageManager: "pnpm",
    });
  });

  it("returns an actionable error for workspace-only monorepos", () => {
    const capability = assessRepositoryPreviewCapability({
      scripts: { lint: "turbo lint" },
      workspaces: ["apps/*"],
    });

    expect(capability.supported).toBe(false);
    expect(capability.reason).toContain("workspace-only monorepo");
  });
});
