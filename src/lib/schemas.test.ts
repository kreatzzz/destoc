import { describe, expect, it } from "vitest";

import {
  createProjectSchema,
  createReviewSchema,
  githubRepositoryUrlSchema,
  selectedElementSchema,
} from "@/lib/schemas";

describe("githubRepositoryUrlSchema", () => {
  it("normalizes a public GitHub repository URL", () => {
    expect(githubRepositoryUrlSchema.parse("https://github.com/acme/design-system.git/")).toEqual({
      url: "https://github.com/acme/design-system",
      owner: "acme",
      repository: "design-system",
    });
  });

  it("rejects a non-GitHub URL", () => {
    expect(() => githubRepositoryUrlSchema.parse("https://example.com/acme/design-system")).toThrow(
      "Only public HTTPS GitHub repository URLs are supported.",
    );
  });

  it("rejects URLs that do not identify exactly one repository", () => {
    expect(() => githubRepositoryUrlSchema.parse("https://github.com/acme/design-system/issues")).toThrow(
      "Use a repository URL",
    );
  });
});

describe("createReviewSchema", () => {
  const baseReview = {
    projectId: "cmqqpfhv00001x5sgwh9ssvm1",
    reviewTargetId: "cmqqpfhv00001x5sgwh9ssvm2",
    scope: "PAGE",
  };

  it("rejects review prompts over 100 words", () => {
    expect(() => createReviewSchema.parse({
      ...baseReview,
      prompt: Array.from({ length: 101 }, () => "word").join(" "),
    })).toThrow("Review prompts are limited to 100 words.");
  });
});

describe("createProjectSchema", () => {
  it("accepts the deterministic demo workspace ID", () => {
    expect(
      createProjectSchema.parse({
        workspaceId: "destoc-demo-workspace",
        githubUrl: "https://github.com/dey11/hanabi",
        defaultBranch: "main",
      }).workspaceId,
    ).toBe("destoc-demo-workspace");
  });
});

describe("selectedElementSchema", () => {
  it("accepts bounded bridge context", () => {
    expect(selectedElementSchema.parse({
      selector: "[data-design-id='hero']",
      role: "heading",
      domPath: ["main", "section", "h1"],
      computedStyles: { fontSize: "48px" },
      boundingBox: { x: 10, y: 10, width: 400, height: 120 },
      classNames: ["text-5xl"],
    }).role).toBe("heading");
  });
});
