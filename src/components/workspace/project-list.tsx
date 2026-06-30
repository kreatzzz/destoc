"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AnimatedArrowUpRightIcon,
  AnimatedDeleteIcon,
  AnimatedFolderOpenIcon,
} from "@/components/ui/animated-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type WorkspaceProjectListItem = {
  id: string;
  name: string;
  githubUrl: string;
  repository: string;
  defaultBranch: string;
  updatedAt: string;
  reviewCount: number;
  revisionCount: number;
  previewStatus?: "QUEUED" | "PROVISIONING" | "BUILDING" | "READY" | "FAILED" | "STOPPED";
};

interface ProjectListProps {
  projects: WorkspaceProjectListItem[];
}

const statusCopy: Record<NonNullable<WorkspaceProjectListItem["previewStatus"]>, string> = {
  QUEUED: "Queued",
  PROVISIONING: "Provisioning",
  BUILDING: "Building",
  READY: "Live",
  FAILED: "Needs attention",
  STOPPED: "Stopped",
};

function statusClassName(status: WorkspaceProjectListItem["previewStatus"]) {
  if (status === "READY") return "bg-[#f7ca58]";
  if (status === "FAILED") return "bg-rose-400";
  if (status === "STOPPED") return "bg-zinc-500";
  if (status) return "bg-amber-300";
  return "bg-zinc-600";
}

export function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();
  const [projectToDelete, setProjectToDelete] = useState<WorkspaceProjectListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openDeleteDialog(project: WorkspaceProjectListItem) {
    setDeleteError(null);
    setProjectToDelete(project);
  }

  async function deleteSelectedProject() {
    if (!projectToDelete || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Repository could not be removed.");

      setProjectToDelete(null);
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Repository could not be removed.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section className="divide-y divide-white/[0.07]">
        {projects.map((project) => (
          <article
            key={project.id}
            className="group relative bg-transparent transition-[background-color] duration-150 ease-out hover:bg-white/[0.035]"
          >
            <div className="flex min-h-16 items-center gap-1 px-3 py-2.5 sm:px-4">
              <Link href={`/workspace/${project.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-white/[0.045] text-zinc-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] transition-[color,background-color] duration-150 ease-out group-hover:bg-[#f7ca58]/10 group-hover:text-[#f7ca58]">
                  <AnimatedFolderOpenIcon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium tracking-[-0.01em] text-zinc-200 group-hover:text-zinc-50">{project.name}</span>
                    <span className={cn("size-1.5 shrink-0 rounded-full", statusClassName(project.previewStatus))} />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-600">{project.repository}</span>
                </span>
              </Link>

              <div className="hidden items-center gap-1.5 md:flex">
                <Badge variant="outline" className="h-6 rounded-md border-white/[0.08] bg-transparent px-2 text-[11px] font-normal text-zinc-500">
                  {project.previewStatus ? statusCopy[project.previewStatus] : "Not started"}
                </Badge>
                <Badge variant="outline" className="h-6 rounded-md border-white/[0.08] bg-transparent px-2 text-[11px] font-normal tabular-nums text-zinc-500">
                  {project.reviewCount} reviews
                </Badge>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${project.name}`}
                    onClick={() => openDeleteDialog(project)}
                    className="size-10 rounded-md text-zinc-700 transition-[color,background-color,scale] duration-150 ease-out hover:bg-rose-400/10 hover:text-rose-300 active:scale-[0.96]"
                  >
                    <AnimatedDeleteIcon size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete repository</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" size="icon-sm" className="size-10 rounded-md text-zinc-600 transition-[color,background-color,scale] duration-150 ease-out hover:bg-white/[0.06] hover:text-zinc-200 active:scale-[0.96]">
                    <Link href={`/workspace/${project.id}`} aria-label={`Open ${project.name}`}>
                      <AnimatedArrowUpRightIcon size={14} />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open project</TooltipContent>
              </Tooltip>
            </div>
          </article>
        ))}
      </section>

      <AlertDialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setProjectToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-rose-400/10 text-rose-300">
              <AnimatedDeleteIcon size={18} />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete {projectToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes its reviews, revisions, and sandbox history from Destoc. The GitHub repository is not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p role="alert" className="rounded-md bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-200">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteSelectedProject();
              }}
            >
              {isDeleting ? "Deleting…" : "Delete repository"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
