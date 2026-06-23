import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/errors";
import { deleteProject, getProject } from "@/server/projects";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    const project = await getProject(user.id, projectId);
    return NextResponse.json({ project });
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    const project = await deleteProject(user.id, projectId);
    return NextResponse.json({ deletedProjectId: project.id });
  });
}
