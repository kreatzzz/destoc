import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/errors";
import { acceptSuggestion } from "@/server/revisions";
import { executeSandboxRun } from "@/server/sandbox-executor";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ suggestionId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { suggestionId } = await params;
    const revision = await acceptSuggestion(user.id, suggestionId);

    if (revision.sandboxRunId) {
      void executeSandboxRun(user.id, {
        sandboxRunId: revision.sandboxRunId,
        projectId: revision.projectId,
        patch: revision.patch,
        revisionId: revision.id,
      }).catch((error: unknown) => {
        console.error("Revision sandbox execution failed after accepting suggestion", error);
      });
    }

    return NextResponse.json({ revision }, { status: 201 });
  });
}
