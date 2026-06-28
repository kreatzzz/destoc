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
    <section className="grid content-start gap-3">
      {projects.map((project) => (
        <article
          key={project.id}
          className="group relative overflow-hidden rounded-[22px] bg-[#1f1f1a] p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.065),0_12px_28px_rgba(0,0,0,0.18)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#24241f] hover:shadow-[0_0_0_1px_rgba(247,202,88,0.24),0_18px_48px_rgba(0,0,0,0.3)]"
        >
          <div className="flex items-center gap-4 rounded-[18px] px-4 py-4">
            <Link href={`/workspace/${project.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-black/35 text-[#f7ca58] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
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
          </div>
        </article>
      ))}
    </section>
  );
}
