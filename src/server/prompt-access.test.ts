import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { assertPromptAccess } from "@/server/prompt-access";

describe("assertPromptAccess", () => {
  it("allows the configured owner email case-insensitively", () => {
    expect(() => assertPromptAccess(" Mkg245108@GMAIL.COM ")).not.toThrow();
  });

  it("rejects prompting for every other signed-in user", () => {
    expect(() => assertPromptAccess("someone@example.com")).toThrow(AppError);
    expect(() => assertPromptAccess("someone@example.com")).toThrow(
      "AI prompting is currently limited to the project owner.",
    );
  });
});
