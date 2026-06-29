import { DestocLogo } from "@/components/app-shell/destoc-logo";
import { AnimatedPlusIcon } from "@/components/ui/animated-icons";
import { ProjectImportForm } from "@/components/workspace/project-import-form";
import { ProjectList, type WorkspaceProjectListItem } from "@/components/workspace/project-list";
import { WorkspaceOnboarding } from "@/components/workspace/workspace-onboarding";
import { WorkspaceLogoutButton } from "@/components/workspace/workspace-logout-button";
import { getCurrentUser } from "@/lib/auth";
import { listProjects, listWorkspaces } from "@/server";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const workspaces = await listWorkspaces(user.id);
  const activeWorkspace = workspaces[0];
  const projects = activeWorkspace ? await listProjects(user.id, activeWorkspace.id) : [];
  const projectItems: WorkspaceProjectListItem[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    githubUrl: project.githubUrl,
    repository: `${project.repositoryOwner}/${project.repositoryName}`,
    defaultBranch: project.defaultBranch,
    updatedAt: project.updatedAt.toLocaleString(),
    reviewCount: project._count.reviews,
    revisionCount: project._count.revisions,
    previewStatus: project.sandboxRuns[0]?.status,
  }));

  return (
    <main className="min-h-dvh bg-[#0a0a0a] text-zinc-100">
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <DestocLogo className="h-7 min-w-7" markClassName="text-[20px]" />
            <div className="h-4 w-px bg-white/10" />
            <span className="truncate text-sm font-medium tracking-[-0.01em] text-zinc-300">Repository control</span>
          </div>
          <WorkspaceLogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        {!activeWorkspace ? (
          <WorkspaceOnboarding />
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-balance text-xl font-semibold tracking-[-0.035em] text-zinc-50">Projects</h1>
                <p className="mt-1 text-sm text-zinc-500">Manage connected repositories and open design sessions.</p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-zinc-500">{projectItems.length} connected</span>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="overflow-hidden rounded-xl bg-[#111111] shadow-[0_0_0_1px_rgba(255,255,255,0.09),0_8px_30px_rgba(0,0,0,0.24)]">
                <div className="flex h-11 items-center border-b border-white/[0.07] px-4">
                  <span className="text-xs font-medium text-zinc-400">Repositories</span>
                </div>
              {projectItems.length ? (
                <ProjectList projects={projectItems} />
              ) : (
                  <div className="px-5 py-14 text-center">
                  <AnimatedPlusIcon size={20} className="mx-auto text-[#f7ca58]" />
                  <p className="mt-3 text-sm font-medium text-zinc-100">No connected projects</p>
                  <p className="mt-1 text-sm text-zinc-500">Import a public GitHub repository to begin a focused review.</p>
                </div>
              )}
            </section>

              <aside className="rounded-xl bg-[#111111] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.09),0_8px_30px_rgba(0,0,0,0.24)]">
                <ProjectImportForm workspaceId={activeWorkspace.id} />
            </aside>
          </div>
          </>
        )}
      </div>
    </main>
  );
}
