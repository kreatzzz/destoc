import { z } from "zod";
import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";
import type { DesignReviewEvidence } from "@/lib/types";

const suggestionSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
  title: z.string().min(1).max(200),
  issue: z.string().min(1).max(4_000),
  rationale: z.string().min(1).max(4_000),
  intendedOutcome: z.string().min(1).max(2_000),
  patch: z.string().max(20_000).optional(),
  verificationChecklist: z.array(z.string().min(1).max(500)).min(1).max(10),
});

export const designReviewResultSchema = z.object({
  summary: z.string().min(1).max(4_000),
  suggestions: z.array(suggestionSchema).max(3),
});

export type DesignReviewResult = z.infer<typeof designReviewResultSchema>;

export type DesignReviewRequest = {
  scope: "COMPONENT" | "PAGE";
  prompt?: string;
  evidence: DesignReviewEvidence;
};

export interface DesignReviewProvider {
  readonly id: "mock" | "deepseek";
  review(request: DesignReviewRequest): Promise<DesignReviewResult>;
}

function componentPatch(sourceFilePath: string | undefined): string | undefined {
  if (!sourceFilePath?.startsWith("src/")) return undefined;

  return [
    `--- a/${sourceFilePath}`,
    `+++ b/${sourceFilePath}`,
    "@@",
    "-className=\"...\"",
    "+className=\"rounded-md border border-border bg-background px-4 py-3 shadow-sm\"",
  ].join("\n");
}

/**
 * A deterministic provider used until a live DeepSeek integration is configured.
 * It intentionally only speaks about supplied evidence so the UI cannot present
 * generic feedback as an analysis of the user’s application.
 */
export const mockDesignReviewProvider: DesignReviewProvider = {
  id: "mock",
  async review(request) {
    const { evidence } = request;
    const elementLabel = evidence.selectedElement?.role ?? evidence.selectedElement?.selector;

    const result: DesignReviewResult = {
      summary: elementLabel
        ? `Review of ${elementLabel} on ${evidence.pageUrl}.`
        : `Page audit of ${evidence.pageUrl}.`,
      suggestions: [
        {
          severity: "medium",
          confidence: 0.86,
          title: elementLabel ? "Strengthen the selected component hierarchy" : "Establish a clearer page hierarchy",
          issue: elementLabel
            ? `The selected ${elementLabel} has no recorded visual hierarchy guidance in the supplied element context.`
            : "The page review has no component-specific target, so the improvement should begin with the highest-priority content grouping.",
          rationale: "Clear grouping, predictable spacing, and restrained elevation make interactive surfaces easier to scan and compare.",
          intendedOutcome: "Create a distinct, consistently spaced surface while preserving the existing content and behavior.",
          patch: request.scope === "COMPONENT" ? componentPatch(evidence.sourceFilePath) : undefined,
          verificationChecklist: [
            "Check the target at the captured desktop viewport.",
            "Confirm text contrast and focus visibility remain intact.",
            "Verify the change does not alter interaction behavior.",
          ],
        },
      ],
    };

    return designReviewResultSchema.parse(result);
  },
};

class DeepSeekProviderPlaceholder implements DesignReviewProvider {
  readonly id = "deepseek" as const;

  async review(): Promise<DesignReviewResult> {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "DeepSeek review is not configured yet. Select the mock provider until the live integration is added.",
    );
  }
}

export function getDesignReviewProvider(): DesignReviewProvider {
  const env = getServerEnv();

  if (env.DESIGN_REVIEW_PROVIDER === "deepseek") {
    if (!env.DEEPSEEK_API_KEY) {
      throw new AppError("CONFIGURATION_ERROR", "DEEPSEEK_API_KEY is required for the DeepSeek provider.");
    }
    return new DeepSeekProviderPlaceholder();
  }

  return mockDesignReviewProvider;
}
