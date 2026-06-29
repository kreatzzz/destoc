import vm from "node:vm";
import { describe, expect, it } from "vitest";

import { createPreviewBridgeProxyScript } from "@/server/preview-bridge";

function embeddedBridgeSource(proxyScript: string) {
  const match = proxyScript.match(/Buffer\.from\("([^"]+)", "base64"\)/);
  if (!match?.[1]) throw new Error("Generated proxy did not contain an embedded bridge.");
  return Buffer.from(match[1], "base64").toString("utf8");
}

describe("createPreviewBridgeProxyScript", () => {
  it("generates valid JavaScript for the sandbox proxy", () => {
    expect(() => new vm.Script(createPreviewBridgeProxyScript(3_000))).not.toThrow();
  });

  it("does not starve hydration or override repository animation styles", () => {
    const bridge = embeddedBridgeSource(createPreviewBridgeProxyScript(3_000));

    expect(bridge).not.toContain("fetchPriority");
    expect(bridge).not.toContain('style.setProperty("opacity"');
    expect(bridge).not.toContain('style.setProperty("filter"');
    expect(bridge).toContain('rootMargin: "800px 0px"');
    expect(bridge).toContain('window.addEventListener("load", start');
  });
});
