import { NextResponse } from "next/server";
import { readJsonBody } from "@/app/api/_route-helpers";
import { requireCurrentUser } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/errors";
import { createReviewTarget } from "@/server/reviews";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const reviewTarget = await createReviewTarget(user.id, await readJsonBody(request));
    return NextResponse.json({ reviewTarget }, { status: 201 });
  });
}
