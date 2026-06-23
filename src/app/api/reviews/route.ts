import { NextResponse } from "next/server";
import { readJsonBody } from "@/app/api/_route-helpers";
import { requireCurrentUser } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/errors";
import { runReview } from "@/server/reviews";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const review = await runReview(user.id, await readJsonBody(request));
    return NextResponse.json({ review }, { status: 201 });
  });
}
