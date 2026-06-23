import type {
  AssetKind,
  ReviewScope,
  ReviewStatus,
  RevisionStatus,
  SandboxRunStatus,
  SuggestionStatus,
} from "@/generated/prisma/client";

export type {
  AssetKind,
  ReviewScope,
  ReviewStatus,
  RevisionStatus,
  SandboxRunStatus,
  SuggestionStatus,
};

export type DesignReviewEvidence = {
  pageUrl: string;
  sourceFilePath?: string;
  selectedElement?: {
    selector: string;
    role?: string;
    text?: string;
    classNames: string[];
  };
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};
