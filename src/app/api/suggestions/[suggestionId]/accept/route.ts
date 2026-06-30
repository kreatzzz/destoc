import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, withRouteErrorHandling } from "@/lib/errors";
import { enqueueRevisionApplication } from "@/server/job-queue";
import { acceptSuggestion, transitionRevision } from "@/server/revisions";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ suggestionId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { suggestionId } = await params;
    const revision = await acceptSuggestion(user.id, suggestionId);
    if (!revision.sandboxRunId) {
      throw new AppError(
        "CONFLICT",
        "This suggestion is not attached to an active sandbox run.",
      );
    }

    try {
      await enqueueRevisionApplication({
        userId: user.id,
        sandboxRunId: revision.sandboxRunId,
        projectId: revision.projectId,
        patch: revision.patch,
        revisionId: revision.id,
      });
    } catch (error) {
      await transitionRevision(user.id, revision.id, "FAILED", {
        errorCode: "QUEUE_UNAVAILABLE",
        errorMessage: "The background worker queue is unavailable. Try accepting the change again shortly.",
      });
      throw new AppError(
        "CONFIGURATION_ERROR",
        "The background worker queue is unavailable. Try accepting the change again shortly.",
        { cause: error },
      );
    }

    return NextResponse.json({ revision }, { status: 202 });
  });
}
