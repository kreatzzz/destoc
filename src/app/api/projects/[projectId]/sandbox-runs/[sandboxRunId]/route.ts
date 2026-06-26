import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { AppError, withRouteErrorHandling } from "@/lib/errors";
import { requireCurrentUser } from "@/lib/auth";
import { requireProjectOwnership } from "@/server/authorization";
import { probeSandboxRunHealth, stopSandboxRun } from "@/server/sandbox-runs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ projectId: string; sandboxRunId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { projectId, sandboxRunId } = await params;

    const url = new URL(request.url);
    if (url.searchParams.get("probe") === "true") {
      const health = await probeSandboxRunHealth(user.id, projectId, sandboxRunId);
      return NextResponse.json(health);
    }

    await requireProjectOwnership(projectId, user.id);

    const sandboxRun = await getPrisma().sandboxRun.findFirst({
      where: { id: sandboxRunId, projectId },
    });
    if (!sandboxRun) throw new AppError("NOT_FOUND", "Sandbox run not found.");

    return NextResponse.json({ sandboxRun });
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { projectId, sandboxRunId } = await params;
    const sandboxRun = await stopSandboxRun(user.id, projectId, sandboxRunId);
    return NextResponse.json({ sandboxRun });
  });
}
