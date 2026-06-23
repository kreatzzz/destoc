import { NextResponse } from "next/server";
import { readJsonBody } from "@/app/api/_route-helpers";
import { requireCurrentUser } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/errors";
import { rejectSuggestion } from "@/server/revisions";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ suggestionId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { suggestionId } = await params;
    const suggestion = await rejectSuggestion(user.id, suggestionId, await readJsonBody(request));
    return NextResponse.json({ suggestion });
  });
}
