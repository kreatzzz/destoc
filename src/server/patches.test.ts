import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { assertPatchIsAllowed } from "@/server/patches";

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

  it("rejects an environment-file patch", () => {
    const unsafePatch = validPatch.replaceAll("src/components/Hero.tsx", ".env.local");
    expect(() => assertPatchIsAllowed(unsafePatch)).toThrow(AppError);
  });

  it("rejects a patch that edits a file other than the selected source", () => {
    expect(() => assertPatchIsAllowed(validPatch, "src/components/Other.tsx")).toThrow(
      "selected source file",
    );
  });
});
