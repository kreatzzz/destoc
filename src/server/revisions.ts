import { RevisionStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { rejectSuggestionSchema } from "@/lib/schemas";
import { requireSuggestionOwnership } from "@/server/authorization";
import { assertPatchIsAllowed } from "@/server/patches";
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

  assertPatchIsAllowed(suggestion.patch, suggestion.review.reviewTarget.sourceFilePath ?? undefined);

  return getPrisma().$transaction(async (transaction) => {
    const changed = await transaction.suggestion.updateMany({
      where: { id: suggestion.id, status: "PENDING" },
      data: { status: "ACCEPTED" },
    });
    if (changed.count !== 1) {
      throw new AppError("CONFLICT", "This suggestion was already decided.");
    }

    // A revision always receives a fresh run. Workers may copy the immutable
    // source commit into this run, apply the persisted patch, and attach assets.
    const sandboxRun = await transaction.sandboxRun.create({
      data: { projectId: suggestion.review.projectId, status: "QUEUED" },
    });

    return transaction.revision.create({
      data: {
        projectId: suggestion.review.projectId,
        suggestionId: suggestion.id,
        sandboxRunId: sandboxRun.id,
        patch: suggestion.patch!,
        status: "QUEUED",
      },
      include: { sandboxRun: true, beforeScreenshot: true, afterScreenshot: true },
    });
  });
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

  return getPrisma().revision.update({
    where: { id: revision.id },
    data: { status: nextStatus, ...metadata },
  });
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
