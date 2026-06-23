import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/errors";
import { createProject, listProjects } from "@/server/projects";
import { readJsonBody } from "@/app/api/_route-helpers";

export const runtime = "nodejs";

const workspaceQuerySchema = z.object({ workspaceId: z.string().cuid() });

export async function GET(request: Request) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const { workspaceId } = workspaceQuerySchema.parse({
      workspaceId: new URL(request.url).searchParams.get("workspaceId"),
    });
    const projects = await listProjects(user.id, workspaceId);
    return NextResponse.json({ projects });
  });
}

export async function POST(request: Request) {
  return withRouteErrorHandling(async () => {
    const user = await requireCurrentUser();
    const project = await createProject(user.id, await readJsonBody(request));
    return NextResponse.json({ project }, { status: 201 });
  });
}
