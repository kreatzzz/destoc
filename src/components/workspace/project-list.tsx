"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { AnimatedArrowUpRightIcon, AnimatedDeleteIcon, AnimatedFolderOpenIcon } from "@/components/ui/animated-icons";
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
  AlertDialogTrigger,
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteProject(projectId: string) {
    setDeletingId(projectId);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Project could not be deleted.");
      }

      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Project could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="grid content-start gap-3">
      {deleteError ? (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {deleteError}
        </p>
      ) : null}

      {projects.map((project) => (
        <article
          key={project.id}
          className="group relative overflow-hidden rounded-2xl bg-white/[0.045] p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.07)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-white/[0.065] hover:shadow-[0_0_0_1px_rgba(247,202,88,0.24),0_16px_44px_rgba(0,0,0,0.28)]"
        >
          <div className="flex items-center gap-4 rounded-[calc(1rem-4px)] px-4 py-3">
            <Link href={`/workspace/${project.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/35 text-[#f7ca58] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                <AnimatedFolderOpenIcon size={17} />
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium tracking-[-0.02em] text-zinc-100">{project.name}</span>
                  <span className={cn("size-1.5 shrink-0 rounded-full", statusClassName(project.previewStatus))} />
                </span>
                <span className="mt-1 block truncate text-xs text-zinc-500">{project.repository}</span>
              </span>
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              <Badge variant="outline" className="border-white/10 bg-black/20 text-zinc-400">
                {project.previewStatus ? statusCopy[project.previewStatus] : "Not started"}
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-black/20 text-zinc-400">
                {project.reviewCount} reviews
              </Badge>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon-sm" className="text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-100">
                  <Link href={`/workspace/${project.id}`} aria-label={`Open ${project.name}`}>
                    <AnimatedArrowUpRightIcon size={14} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open project</TooltipContent>
            </Tooltip>

            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${project.name}`}
                      disabled={deletingId === project.id}
                      className="text-zinc-500 hover:bg-rose-500/10 hover:text-rose-200"
                    >
                      {deletingId === project.id ? <Loader2 className="animate-spin" /> : <AnimatedDeleteIcon size={14} />}
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete project</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-rose-500/10 text-rose-300">
                    <AnimatedDeleteIcon size={22} />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes {project.repository} from Destoc, including saved reviews, selections, and revisions.
                    The GitHub repository itself is not changed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingId === project.id}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={deletingId === project.id}
                    onClick={() => void deleteProject(project.id)}
                  >
                    {deletingId === project.id ? "Deleting…" : "Delete project"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </article>
      ))}
    </section>
  );
}
