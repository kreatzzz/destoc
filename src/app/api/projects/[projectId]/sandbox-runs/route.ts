import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/app/api/_route-helpers";
import { requireCurrentUser } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/errors";
import { executeSandboxRun } from "@/server/sandbox-executor";
import { queueSandboxRun } from "@/server/sandbox-runs";

export const runtime = "nodejs";
export const maxDuration = 300;

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

    void executeSandboxRun(user.id, {
      sandboxRunId: sandboxRun.id,
      projectId,
      commitSha,
    }).catch((error: unknown) => {
      console.error("Sandbox execution failed after queueing", error);
    });

    return NextResponse.json({ sandboxRun }, { status: 202 });
  });
}
