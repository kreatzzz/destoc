import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/errors";
import { getRevision } from "@/server/revisions";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ revisionId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { revisionId } = await params;
    const revision = await getRevision(user.id, revisionId);
    return NextResponse.json({ revision });
  });
}
