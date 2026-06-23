import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/errors";
import { getReview } from "@/server/reviews";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ reviewId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { reviewId } = await params;
    const review = await getReview(user.id, reviewId);
    return NextResponse.json({ review });
  });
}
