import { describe, expect, it } from "vitest";

import { withCodexExecSafetyArgs } from "@/lib/review-provider";

describe("withCodexExecSafetyArgs", () => {
  it("allows Codex to run from the production worker application directory", () => {
    expect(withCodexExecSafetyArgs("codex", ["exec", "--ephemeral", "-"])).toEqual([
      "exec",
      "--skip-git-repo-check",
      "--ephemeral",
      "-",
    ]);
  });

  it("does not duplicate an explicit repository-check override", () => {
    const args = ["exec", "--skip-git-repo-check", "-"];
    expect(withCodexExecSafetyArgs("/usr/local/bin/codex", args)).toEqual(args);
  });

  it("does not modify unrelated command providers", () => {
    expect(withCodexExecSafetyArgs("review-provider", ["--json"])).toEqual(["--json"]);
  });
});
