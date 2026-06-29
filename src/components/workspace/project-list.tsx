"use client";

import Link from "next/link";

import { AnimatedArrowUpRightIcon, AnimatedFolderOpenIcon } from "@/components/ui/animated-icons";
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
  return (
    <section className="divide-y divide-white/[0.07]">
      {projects.map((project) => (
        <article
          key={project.id}
          className="group relative bg-transparent transition-[background-color] duration-150 ease-out hover:bg-white/[0.035]"
        >
          <div className="flex min-h-16 items-center gap-3 px-3 py-2.5 sm:px-4">
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
  );
}
