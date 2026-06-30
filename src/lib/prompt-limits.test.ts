import { describe, expect, it } from "vitest";

import {
  countWords,
  limitWords,
  REVIEW_PROMPT_WORD_LIMIT,
} from "@/lib/prompt-limits";

describe("review prompt word limits", () => {
  it("counts words across repeated whitespace", () => {
    expect(countWords("  improve\n\nthis   heading ")).toBe(3);
  });

  it("preserves prompts within the limit", () => {
    expect(limitWords("keep this prompt", REVIEW_PROMPT_WORD_LIMIT)).toBe("keep this prompt");
  });

  it("truncates pasted prompts after the final allowed word", () => {
    expect(limitWords("one two three four", 3)).toBe("one two three");
  });
});
