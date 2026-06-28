import { notFound } from "next/navigation";

import { DesignWorkspace } from "@/components/workspace/design-workspace";
import type { WorkspaceData } from "@/components/workspace/types";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getProject } from "@/server";

export default async function ProjectWorkspacePage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { projectId } = await params;

  const project = await getProject(user.id, projectId).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  const latestSandboxRun = project.sandboxRuns[0];
  const data: WorkspaceData = {
    project: {
      id: project.id,
      name: project.name,
      repository: `${project.repositoryOwner}/${project.repositoryName}`,
      branch: project.defaultBranch,
      updatedAt: project.updatedAt.toLocaleString(),
      revisionCount: project.revisions.length,
    },
    revisions: project.revisions.map((revision, index) => ({
      id: revision.id,
      label: index === 0 ? "Current revision" : `Revision ${project.revisions.length - index}`,
      description: revision.status.toLowerCase(),
      createdAt: revision.createdAt.toLocaleString(),
      isActive: index === 0,
    })),
    // A workspace open is a fresh design session. Historical reviews remain in
    // the database for audit/history, but old suggestion cards should not
    // reappear in the live chat or code pane after a sandbox restart.
    suggestions: [],
    preview: latestSandboxRun
      ? {
          runId: latestSandboxRun.id,
          status: latestSandboxRun.status,
          url: latestSandboxRun.status === "READY" ? latestSandboxRun.previewUrl ?? undefined : undefined,
          errorMessage: latestSandboxRun.errorMessage,
        }
      : undefined,
  };

  return <DesignWorkspace data={data} />;
}
