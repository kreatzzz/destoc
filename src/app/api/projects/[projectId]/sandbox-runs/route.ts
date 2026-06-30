import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/app/api/_route-helpers";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, withRouteErrorHandling } from "@/lib/errors";
import { enqueueSandboxExecution } from "@/server/job-queue";
import { queueSandboxRun, transitionSandboxRun } from "@/server/sandbox-runs";

export const runtime = "nodejs";
const queueSandboxRunSchema = z.object({
  commitSha: z.string().trim().regex(/^[a-f0-9]{7,64}$/i, "Commit SHA is invalid.").optional(),
});

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    const { commitSha } = queueSandboxRunSchema.parse(await readJsonBody(request));
    const sandboxRun = await queueSandboxRun(user.id, projectId, commitSha);

    try {
      await enqueueSandboxExecution({
        userId: user.id,
        sandboxRunId: sandboxRun.id,
        projectId,
        commitSha,
      });
    } catch (error) {
      await transitionSandboxRun(user.id, sandboxRun.id, "FAILED", {
        errorCode: "QUEUE_UNAVAILABLE",
        errorMessage: "The background worker queue is unavailable. Try again shortly.",
      });
      throw new AppError(
        "CONFIGURATION_ERROR",
        "The background worker queue is unavailable. Try again shortly.",
        { cause: error },
      );
    }

    return NextResponse.json({ sandboxRun }, { status: 202 });
  });
}
