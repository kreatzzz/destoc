import Link from "next/link";
import { ArrowUpRight, FolderOpen, Plus } from "lucide-react";

import { ProjectImportForm } from "@/components/workspace/project-import-form";
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

  return (
    <main className="min-h-dvh bg-background px-6 py-10">
      <div className="mx-auto grid max-w-5xl gap-8">
        <header className="flex items-end justify-between gap-6 border-b pb-6">
          <div>
            <p className="text-sm text-muted-foreground">{activeWorkspace?.name ?? "Your design workspace"}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Projects</h1>
          </div>
          {activeWorkspace ? <Badge variant="secondary">{projects.length} connected</Badge> : null}
        </header>

        {!activeWorkspace ? <WorkspaceOnboarding /> : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="grid content-start gap-3">
              {projects.length ? projects.map((project) => (
                <Link key={project.id} href={`/workspace/${project.id}`} className="group flex items-center justify-between rounded-xl border bg-card p-5 transition-colors hover:bg-accent">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-muted"><FolderOpen className="size-4" /></span>
                    <span className="min-w-0"><span className="block truncate font-medium">{project.name}</span><span className="mt-1 block truncate text-sm text-muted-foreground">{project.githubUrl}</span></span>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed p-10 text-center"><Plus className="mx-auto size-5 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No connected projects</p><p className="mt-1 text-sm text-muted-foreground">Import a public GitHub repository to begin a focused review.</p></div>
              )}
            </section>
            <ProjectImportForm workspaceId={activeWorkspace.id} />
          </div>
        )}
        <Button asChild variant="ghost" className="w-fit"><Link href="/">Back to start</Link></Button>
      </div>
    </main>
  );
}
