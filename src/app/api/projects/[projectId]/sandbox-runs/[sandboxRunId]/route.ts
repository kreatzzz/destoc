import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { AppError, withRouteErrorHandling } from "@/lib/errors";
import { requireCurrentUser } from "@/lib/auth";
import { requireProjectOwnership } from "@/server/authorization";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ projectId: string; sandboxRunId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { projectId, sandboxRunId } = await params;
    await requireProjectOwnership(projectId, user.id);

    const sandboxRun = await getPrisma().sandboxRun.findFirst({
      where: { id: sandboxRunId, projectId },
    });
    if (!sandboxRun) throw new AppError("NOT_FOUND", "Sandbox run not found.");

    return NextResponse.json({ sandboxRun });
  });
}
