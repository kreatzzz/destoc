import { NextResponse } from "next/server";
import { readJsonBody } from "@/app/api/_route-helpers";
import { requireCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { AppError, withRouteErrorHandling } from "@/lib/errors";
import { enqueueReviewExecution } from "@/server/job-queue";
import { assertPromptAccess } from "@/server/prompt-access";
import { createReview } from "@/server/reviews";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    assertPromptAccess(user.email);
    const review = await createReview(user.id, await readJsonBody(request));
    try {
      await enqueueReviewExecution({ userId: user.id, reviewId: review.id });
    } catch (error) {
      await getPrisma().review.update({
        where: { id: review.id },
        data: {
          status: "FAILED",
          errorCode: "QUEUE_UNAVAILABLE",
          errorMessage: "The background worker queue is unavailable.",
        },
      });
      throw new AppError(
        "CONFIGURATION_ERROR",
        "The background worker queue is unavailable. Try again shortly.",
        { cause: error },
      );
    }
    return NextResponse.json({ review }, { status: 202 });
  });
}
