import { Prisma, RevisionStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { rejectSuggestionSchema } from "@/lib/schemas";
import { requireSuggestionOwnership } from "@/server/authorization";
import { assertPatchIsAllowed, normalizeUnifiedDiff } from "@/server/patches";
import { enforceRateLimit } from "@/server/rate-limit";

const allowedRevisionTransitions: Record<RevisionStatus, readonly RevisionStatus[]> = {
  QUEUED: ["APPLYING", "FAILED"],
  APPLYING: ["READY", "FAILED"],
  READY: [],
  FAILED: [],
};

export async function acceptSuggestion(userId: string, suggestionId: string) {
  await enforceRateLimit("mutation", userId);
  const suggestion = await requireSuggestionOwnership(suggestionId, userId);

  if (suggestion.status !== "PENDING") {
    throw new AppError("CONFLICT", "Only pending suggestions can be accepted.");
  }
  if (!suggestion.patch) {
    throw new AppError("VALIDATION_ERROR", "This suggestion does not include a safe patch to apply.");
  }

  const normalizedPatch = normalizeUnifiedDiff(suggestion.patch);
  assertPatchIsAllowed(normalizedPatch, suggestion.review.reviewTarget.sourceFilePath ?? undefined);

  try {
    const sandboxRunId = suggestion.review.reviewTarget.sandboxRunId;
    if (!sandboxRunId) {
      throw new AppError("CONFLICT", "This suggestion is not attached to a live sandbox preview.");
    }

    return await getPrisma().$transaction(async (transaction) => {
      const existingRevision = await transaction.revision.findUnique({
        where: { suggestionId: suggestion.id },
      });

      if (existingRevision) {
        if (existingRevision.status !== "FAILED") {
          throw new AppError("CONFLICT", "This suggestion is already being applied.");
        }

        return transaction.revision.update({
          where: { id: existingRevision.id },
          data: {
            sandboxRunId,
            patch: normalizedPatch,
            status: "QUEUED",
            errorCode: null,
            errorMessage: null,
          },
          include: { sandboxRun: true, beforeScreenshot: true, afterScreenshot: true },
        });
      }

      return transaction.revision.create({
        data: {
          projectId: suggestion.review.projectId,
          suggestionId: suggestion.id,
          sandboxRunId,
          patch: normalizedPatch,
          status: "QUEUED",
        },
        include: { sandboxRun: true, beforeScreenshot: true, afterScreenshot: true },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("CONFLICT", "This suggestion is already being applied.", { cause: error });
    }
    throw error;
  }
}

export async function rejectSuggestion(userId: string, suggestionId: string, input: unknown = {}) {
  await enforceRateLimit("mutation", userId);
  const { reason } = rejectSuggestionSchema.parse(input);
  const suggestion = await requireSuggestionOwnership(suggestionId, userId);

  if (suggestion.status !== "PENDING") {
    throw new AppError("CONFLICT", "Only pending suggestions can be rejected.");
  }

  const changed = await getPrisma().suggestion.updateMany({
    where: { id: suggestion.id, status: "PENDING" },
    data: { status: "REJECTED", rejectionReason: reason },
  });
  if (changed.count !== 1) {
    throw new AppError("CONFLICT", "This suggestion was already decided.");
  }

  return getPrisma().suggestion.findUniqueOrThrow({ where: { id: suggestion.id } });
}

export async function transitionRevision(
  userId: string,
  revisionId: string,
  nextStatus: RevisionStatus,
  metadata: { errorCode?: string; errorMessage?: string } = {},
) {
  const revision = await getPrisma().revision.findFirst({
    where: { id: revisionId, project: { workspace: { userId } } },
  });
  if (!revision) throw new AppError("NOT_FOUND", "Revision not found.");
  if (!allowedRevisionTransitions[revision.status].includes(nextStatus)) {
    throw new AppError("CONFLICT", `Cannot transition a ${revision.status} revision to ${nextStatus}.`);
  }

  if (nextStatus === "READY") {
    return getPrisma().$transaction(async (transaction) => {
      const updatedRevision = await transaction.revision.update({
        where: { id: revision.id },
        data: { status: nextStatus, errorCode: null, errorMessage: null },
      });
      await transaction.suggestion.update({
        where: { id: revision.suggestionId },
        data: { status: "ACCEPTED", errorCode: null, errorMessage: null },
      });
      return updatedRevision;
    });
  }

  const updatedRevision = await getPrisma().revision.update({
    where: { id: revision.id },
    data: { status: nextStatus, ...metadata },
  });

  if (nextStatus === "FAILED") {
    await getPrisma().suggestion.update({
      where: { id: revision.suggestionId },
      data: {
        errorCode: metadata.errorCode,
        errorMessage: metadata.errorMessage,
      },
    });
  }

  return updatedRevision;
}

export async function getRevision(userId: string, revisionId: string) {
  const revision = await getPrisma().revision.findFirst({
    where: { id: revisionId, project: { workspace: { userId } } },
    include: {
      suggestion: true,
      sandboxRun: true,
      beforeScreenshot: true,
      afterScreenshot: true,
    },
  });
  if (!revision) throw new AppError("NOT_FOUND", "Revision not found.");
  return revision;
}
