import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/errors";
import { acceptSuggestion } from "@/server/revisions";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ suggestionId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { suggestionId } = await params;
    const revision = await acceptSuggestion(user.id, suggestionId);
    return NextResponse.json({ revision }, { status: 201 });
  });
}
