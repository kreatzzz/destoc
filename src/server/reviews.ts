import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { AppError, asAppError } from "@/lib/errors";
import { getDesignReviewProvider } from "@/lib/review-provider";
import {
  createReviewSchema,
  createReviewTargetSchema,
  type CreateReviewInput,
  type CreateReviewTargetInput,
} from "@/lib/schemas";
import { requireProjectOwnership } from "@/server/authorization";
import { assertPatchIsAllowed } from "@/server/patches";
import { enforceRateLimit } from "@/server/rate-limit";
import { sourceContextForReview } from "@/server/source-context";

export async function createReviewTarget(userId: string, input: CreateReviewTargetInput | unknown) {
  await enforceRateLimit("mutation", userId);
  const parsed = createReviewTargetSchema.parse(input);
  await requireProjectOwnership(parsed.projectId, userId);

  if (parsed.sandboxRunId) {
    const run = await getPrisma().sandboxRun.findFirst({
      where: { id: parsed.sandboxRunId, projectId: parsed.projectId },
    });
    if (!run) throw new AppError("NOT_FOUND", "Sandbox run not found for this project.");
    if (run.status !== "READY") {
      throw new AppError("CONFLICT", "Select an element only from a ready sandbox preview.");
    }
  }

  return getPrisma().reviewTarget.create({
    data: {
      projectId: parsed.projectId,
      sandboxRunId: parsed.sandboxRunId,
      pageUrl: parsed.pageUrl,
      sourceFilePath: parsed.sourceFilePath,
      domContext: parsed.domContext as Prisma.InputJsonValue | undefined,
      element: parsed.element
        ? {
            create: {
              selector: parsed.element.selector,
              role: parsed.element.role,
              text: parsed.element.text,
              domPath: parsed.element.domPath,
              computedStyles: parsed.element.computedStyles,
              boundingBox: parsed.element.boundingBox,
              classNames: parsed.element.classNames,
            },
          }
        : undefined,
    },
    include: { element: true },
  });
}

export async function runReview(userId: string, input: CreateReviewInput | unknown) {
  await enforceRateLimit("review", userId);
  const parsed = createReviewSchema.parse(input);
  await requireProjectOwnership(parsed.projectId, userId);

  const target = await getPrisma().reviewTarget.findFirst({
    where: { id: parsed.reviewTargetId, projectId: parsed.projectId },
    include: { element: true, project: true },
  });
  if (!target) throw new AppError("NOT_FOUND", "Review target not found.");

  if (parsed.scope === "COMPONENT" && (!target.element || !target.sourceFilePath)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Component reviews require a selected element and confirmed source file.",
    );
  }

  const provider = getDesignReviewProvider();
  const review = await getPrisma().review.create({
    data: {
      projectId: parsed.projectId,
      reviewTargetId: target.id,
      scope: parsed.scope,
      status: "RUNNING",
      provider: provider.id,
      prompt: parsed.prompt,
    },
  });

  try {
    const sourceContext = await sourceContextForReview(target.project, target, parsed.prompt).catch(() => ({
      candidates: [],
      note: "Source context lookup failed; provider received DOM evidence only.",
    }));

    const result = await provider.review({
      scope: parsed.scope,
      prompt: parsed.prompt,
      evidence: {
        pageUrl: target.pageUrl,
        repository: {
          owner: target.project.repositoryOwner,
          name: target.project.repositoryName,
          url: target.project.githubUrl,
          defaultBranch: target.project.defaultBranch,
        },
        sourceContext,
        sourceFilePath: target.sourceFilePath ?? undefined,
        selectedElement: target.element
          ? {
              selector: target.element.selector,
              role: target.element.role ?? undefined,
              text: target.element.text ?? undefined,
              classNames: target.element.classNames,
            }
          : undefined,
      },
    });

    for (const suggestion of result.suggestions) {
      if (suggestion.patch) assertPatchIsAllowed(suggestion.patch, target.sourceFilePath ?? undefined);
    }

    return await getPrisma().$transaction(async (transaction) => {
      await transaction.suggestion.createMany({
        data: result.suggestions.map((suggestion) => ({
          reviewId: review.id,
          severity: suggestion.severity,
          confidence: suggestion.confidence,
          title: suggestion.title,
          issue: suggestion.issue,
          rationale: suggestion.rationale,
          intendedOutcome: suggestion.intendedOutcome,
          patch: suggestion.patch,
          verificationChecklist: suggestion.verificationChecklist,
        })),
      });

      return transaction.review.update({
        where: { id: review.id },
        data: {
          status: "READY",
          result: result as Prisma.InputJsonValue,
        },
        include: { suggestions: { orderBy: { createdAt: "asc" } } },
      });
    });
  } catch (error) {
    const appError = asAppError(error);
    await getPrisma().review.update({
      where: { id: review.id },
      data: {
        status: "FAILED",
        errorCode: appError.code,
        errorMessage: appError.expose ? appError.message : "Review provider failed.",
      },
    });
    throw error;
  }
}

export async function getReview(userId: string, reviewId: string) {
  const review = await getPrisma().review.findFirst({
    where: { id: reviewId, project: { workspace: { userId } } },
    include: {
      reviewTarget: { include: { element: true } },
      suggestions: { orderBy: { createdAt: "asc" }, include: { revision: true } },
    },
  });

  if (!review) throw new AppError("NOT_FOUND", "Review not found.");
  return review;
}
