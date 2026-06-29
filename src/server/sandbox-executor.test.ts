import { describe, expect, it } from "vitest";

import { previewStartCommand } from "@/server/sandbox-executor";

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
});
