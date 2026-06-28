import { describe, expect, it } from "vitest";

import { inferSimpleTextReplacementPatches, type SourceContext } from "@/server/source-context";

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

});
