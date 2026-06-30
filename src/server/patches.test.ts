import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { assertPatchIsAllowed, normalizeUnifiedDiff } from "@/server/patches";

const validPatch = [
  "--- a/src/components/Hero.tsx",
  "+++ b/src/components/Hero.tsx",
  "@@",
  "-className=\"text-sm\"",
  "+className=\"text-base\"",
].join("\n");

describe("assertPatchIsAllowed", () => {
  it("allows a one-file UI patch for the confirmed source file", () => {
    expect(() => assertPatchIsAllowed(validPatch, "src/components/Hero.tsx")).not.toThrow();
  });

  it.each([
    "src/App.tsx",
    "src/main.tsx",
    "src/index.css",
    "pages/index.tsx",
    "styles/globals.css",
  ])("allows common editable UI entry point %s", (path) => {
    const patch = validPatch.replaceAll("src/components/Hero.tsx", path);
    expect(() => assertPatchIsAllowed(patch, path)).not.toThrow();
  });

  it("rejects an environment-file patch", () => {
    const unsafePatch = validPatch.replaceAll("src/components/Hero.tsx", ".env.local");
    expect(() => assertPatchIsAllowed(unsafePatch)).toThrow(AppError);
  });

  it("rejects a patch that edits a file other than the selected source", () => {
    expect(() => assertPatchIsAllowed(validPatch, "src/components/Other.tsx")).toThrow(
      "selected source file",
    );
  });

  it("normalizes fenced patch output before validation", () => {
    const fencedPatch = `\`\`\`diff\n${validPatch}\n\`\`\``;
    expect(normalizeUnifiedDiff(fencedPatch)).toBe(`${validPatch}\n`);
    expect(() => assertPatchIsAllowed(fencedPatch, "src/components/Hero.tsx")).not.toThrow();
  });

  it("rejects malformed hunks before they reach sandbox apply", () => {
    const corruptPatch = [
      "--- a/src/components/Hero.tsx",
      "+++ b/src/components/Hero.tsx",
      "@@",
      "-const label = \"Recent works\";",
      "const missingPrefix = true;",
      "+const label = \"Recent projects\";",
    ].join("\n");

    expect(() => assertPatchIsAllowed(corruptPatch)).toThrow("unprefixed source line");
  });
});
