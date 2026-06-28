import { DestocLogo } from "@/components/app-shell/destoc-logo";
import { AnimatedArrowRightIcon, AnimatedPlusIcon } from "@/components/ui/animated-icons";
import { ProjectImportForm } from "@/components/workspace/project-import-form";
import { ProjectList, type WorkspaceProjectListItem } from "@/components/workspace/project-list";
import { WorkspaceOnboarding } from "@/components/workspace/workspace-onboarding";
import { WorkspaceLogoutButton } from "@/components/workspace/workspace-logout-button";
import { Badge } from "@/components/ui/badge";
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
    <main className="min-h-dvh overflow-hidden bg-[#111110] px-5 py-5 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(247,202,88,0.12),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.06),transparent_28%)]" />
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-7xl flex-col gap-8">
        <header className="flex items-center justify-between gap-6 px-2 pt-2 md:px-4">
          <div className="flex min-w-0 items-center gap-4">
            <DestocLogo className="h-9 min-w-9" markClassName="text-[25px]" />
            <div className="min-w-0">
              <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-zinc-50">Repository control</h1>
            </div>
          </div>
          <WorkspaceLogoutButton />
        </header>

        {!activeWorkspace ? (
          <WorkspaceOnboarding />
        ) : (
          <div className="grid min-h-[min(720px,calc(100dvh-11rem))] gap-4 rounded-[32px] bg-[#13120e] p-4 shadow-[0_32px_110px_rgba(0,0,0,0.44),inset_0_0_0_1px_rgba(247,202,88,0.15)] lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="grid min-h-0 content-start gap-4 rounded-[26px] bg-[#171713] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.065),0_14px_44px_rgba(0,0,0,0.22)]">
              <div className="flex min-h-12 items-center rounded-2xl bg-black/18 px-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                <Badge variant="outline" className="border-[#f7ca58]/25 bg-[#f7ca58]/10 text-[#f7ca58] shadow-[0_8px_24px_rgba(247,202,88,0.08)]">
                  {projectItems.length} connected
                </Badge>
              </div>

              {projectItems.length ? (
                <ProjectList projects={projectItems} />
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-10 text-center">
                  <AnimatedPlusIcon size={20} className="mx-auto text-[#f7ca58]" />
                  <p className="mt-3 text-sm font-medium text-zinc-100">No connected projects</p>
                  <p className="mt-1 text-sm text-zinc-500">Import a public GitHub repository to begin a focused review.</p>
                </div>
              )}
            </section>
            <aside className="grid min-h-0 content-start rounded-[26px] bg-[#171713] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.065),0_14px_44px_rgba(0,0,0,0.22)]">
              <div className="rounded-[22px] bg-black/18 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Import repository</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Public GitHub repos only for v1.</p>
                  </div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#f7ca58]/12 text-[#f7ca58] shadow-[inset_0_0_0_1px_rgba(247,202,88,0.10)]">
                    <AnimatedArrowRightIcon size={15} />
                  </span>
                </div>
                <ProjectImportForm workspaceId={activeWorkspace.id} />
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
