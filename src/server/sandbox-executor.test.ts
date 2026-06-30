import { describe, expect, it } from "vitest";

import {
  dependencyInstallCommand,
  previewStartCommand,
  previewStopCommand,
} from "@/server/sandbox-executor";

describe("previewStartCommand", () => {
  it("serves Next.js production output without a development HMR socket", () => {
    const command = previewStartCommand(true, {
      build: "next build",
      dev: "next dev",
      start: "next start",
    });

    expect(command).toContain("npm run start");
    expect(command).not.toContain("npm run dev");
  });

  it("keeps non-Next development servers for live source updates", () => {
    const command = previewStartCommand(false, { dev: "vite" });

    expect(command).toContain("npm run dev");
  });

  it("uses the repository package manager for preview scripts", () => {
    expect(previewStartCommand(false, { dev: "vite" }, "pnpm")).toContain("pnpm run dev");
    expect(previewStartCommand(true, { build: "next build", start: "next start" }, "bun"))
      .toContain("bun run start");
  });
});

describe("dependencyInstallCommand", () => {
  it("uses immutable lockfile installs for supported package managers", () => {
    expect(dependencyInstallCommand("npm")).toContain("npm ci");
    expect(dependencyInstallCommand("pnpm")).toContain("pnpm install --frozen-lockfile");
    expect(dependencyInstallCommand("yarn")).toContain("yarn install --immutable");
    expect(dependencyInstallCommand("bun")).toContain("bun install --frozen-lockfile");
  });
});

describe("previewStopCommand", () => {
  it("stops the bridge and supported framework processes before a patched restart", () => {
    const command = previewStopCommand();

    expect(command).toContain("destoc-preview-bridge");
    expect(command).toContain("[n]ext-server");
    expect(command).toContain("[v]ite");
    expect(command).toContain("pkill -TERM");
  });
});
