import Link from "next/link";

import { DestocLogo } from "@/components/app-shell/destoc-logo";
import { AnimatedArrowRightIcon, AnimatedPlusIcon } from "@/components/ui/animated-icons";
import { ProjectImportForm } from "@/components/workspace/project-import-form";
import { ProjectList, type WorkspaceProjectListItem } from "@/components/workspace/project-list";
import { WorkspaceOnboarding } from "@/components/workspace/workspace-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const liveProjects = projectItems.filter((project) => project.previewStatus === "READY").length;
  const attentionProjects = projectItems.filter((project) => project.previewStatus === "FAILED").length;

  return (
    <main className="min-h-dvh overflow-hidden bg-[#111110] px-5 py-5 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(247,202,88,0.12),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.06),transparent_28%)]" />
      <div className="mx-auto grid min-h-[calc(100dvh-2.5rem)] max-w-6xl gap-6">
        <header className="flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <DestocLogo className="h-9 min-w-9" markClassName="text-[25px]" />
            <div className="min-w-0">
              <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-zinc-50">Repository control</h1>
            </div>
          </div>
          <Button asChild variant="ghost" className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100">
            <Link href="/">Back to start</Link>
          </Button>
        </header>

        {!activeWorkspace ? <WorkspaceOnboarding /> : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="grid content-start gap-5">
              <div className="flex flex-col justify-between gap-8 px-1 py-2 md:flex-row md:items-end">
                <div className="max-w-xl">
                  <Badge variant="outline" className="border-[#f7ca58]/20 bg-[#f7ca58]/10 text-[#f7ca58]">
                    {projectItems.length} connected
                  </Badge>
                  <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-balance text-zinc-50">
                    Choose a repo and continue the design pass.
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-pretty text-zinc-500">
                    Import public repositories, inspect their live preview, and keep review context attached to each project.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-black/25 px-4 py-3">
                    <p className="text-2xl font-semibold tabular-nums text-zinc-100">{projectItems.length}</p>
                    <p className="mt-1 text-[11px] text-zinc-600">Projects</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 px-4 py-3">
                    <p className="text-2xl font-semibold tabular-nums text-[#f7ca58]">{liveProjects}</p>
                    <p className="mt-1 text-[11px] text-zinc-600">Live</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 px-4 py-3">
                    <p className="text-2xl font-semibold tabular-nums text-rose-300">{attentionProjects}</p>
                    <p className="mt-1 text-[11px] text-zinc-600">Failed</p>
                  </div>
                </div>
              </div>

              {projectItems.length ? <ProjectList projects={projectItems} /> : (
                <div className="border border-dashed border-white/10 bg-white/[0.025] p-10 text-center">
                  <AnimatedPlusIcon size={20} className="mx-auto text-[#f7ca58]" />
                  <p className="mt-3 text-sm font-medium text-zinc-100">No connected projects</p>
                  <p className="mt-1 text-sm text-zinc-500">Import a public GitHub repository to begin a focused review.</p>
                </div>
              )}
            </section>
            <aside className="grid content-start gap-6 px-1 py-2">
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Import repository</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Public GitHub repos only for v1.</p>
                  </div>
                  <span className="grid size-8 place-items-center rounded-xl bg-[#f7ca58]/10 text-[#f7ca58]">
                    <AnimatedArrowRightIcon size={15} />
                  </span>
                </div>
                <ProjectImportForm workspaceId={activeWorkspace.id} />
              </div>
              <div className="text-xs leading-5 text-zinc-500">
                <p className="font-medium text-zinc-300">Local AI experiments</p>
                <p className="mt-2">
                  Use the mock provider for free local UI experiments. A live provider still needs an API endpoint and key.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
