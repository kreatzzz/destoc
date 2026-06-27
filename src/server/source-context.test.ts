import { describe, expect, it } from "vitest";

import { applyUnifiedDiffToCandidates, inferSimpleTextReplacementPatches, type SourceContext } from "@/server/source-context";

describe("inferSimpleTextReplacementPatches", () => {
  it("creates one safe patch per direct selected component rename note", () => {
    const sourceContext: SourceContext = {
      note: "test",
      candidates: [
        {
          path: "src/app/page.tsx",
          content: [
            "export default function Page() {",
            "  return <main><h1>Your Digital Impression.</h1><a>Recent works</a></main>;",
            "}",
          ].join("\n"),
        },
      ],
    };

    const target = {
      domContext: {
        selectedElements: [
          {
            role: "heading",
            text: "Your Digital Impression.",
            note: "rename to Digital websites that convert",
          },
          {
            role: "link",
            text: "Recent works",
            note: "rename to recent projects",
          },
        ],
      },
      element: null,
    };

    const patches = inferSimpleTextReplacementPatches(sourceContext, target as never);

    expect(patches).toHaveLength(1);
    expect(patches[0]?.title).toBe("Apply 2 selected text changes");
    expect(patches[0]?.patch).toContain("+  return <main><h1>Digital websites that convert</h1><a>Recent projects</a></main>;");
  });

  it("applies overlapping accepted patches to source candidates", () => {
    const candidates = [{
      path: "app/page.tsx",
      content: [
        "export default function Home() {",
        "  return (",
        "    <section>",
        "      <Reveal>",
        "        <h3>Our Services</h3>",
        "      </Reveal>",
        "      <Reveal delay={0.06}>",
        "        <h2>We specialise in making things</h2>",
        "      </Reveal>",
        "      <ServiceCards />",
        "    </section>",
        "  );",
        "}",
      ].join("\n"),
    }];

    const removeEyebrow = [
      "--- a/app/page.tsx",
      "+++ b/app/page.tsx",
      "@@ -4,5 +4,0 @@",
      "-      <Reveal>",
      "-        <h3>Our Services</h3>",
      "-      </Reveal>",
    ].join("\n");
    const removeHeadlineWithOverlappingContext = [
      "--- a/app/page.tsx",
      "+++ b/app/page.tsx",
      "@@ -4,6 +4,0 @@",
      "-      <Reveal>",
      "-        <h3>Our Services</h3>",
      "-      </Reveal>",
      "-      <Reveal delay={0.06}>",
      "-        <h2>We specialise in making things</h2>",
      "-      </Reveal>",
    ].join("\n");

    expect(applyUnifiedDiffToCandidates(candidates, removeEyebrow)).toBe(true);
    expect(applyUnifiedDiffToCandidates(candidates, removeHeadlineWithOverlappingContext)).toBe(true);
    expect(candidates[0]?.content).not.toContain("Our Services");
    expect(candidates[0]?.content).not.toContain("We specialise");
  });
});
