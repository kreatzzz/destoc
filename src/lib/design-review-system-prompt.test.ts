import { describe, expect, it } from "vitest";

import { DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT } from "@/lib/design-review-system-prompt";

describe("DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT", () => {
  it("keeps design reviews evidence-bound and implementation-focused", () => {
    expect(DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT).toContain("Use only the supplied");
    expect(DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT).toContain("produce a safe implementation");
    expect(DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT).toContain("valid unified diff");
  });

  it("does not let a drafted change masquerade as an applied change", () => {
    expect(DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT).toContain("Never say a patch was applied");
    expect(DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT).toContain("Say drafted or prepared instead");
  });

  it("includes the core interface-quality constraints", () => {
    expect(DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT).toContain("scale(0.96)");
    expect(DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT).toContain("never use transition: all");
    expect(DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT).toContain("at least 40 by 40 CSS pixels");
    expect(DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT).toContain("radii concentric");
  });
});
