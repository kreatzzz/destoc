import { Check, ChevronRight, CircleDot, GitBranch, GitFork, History, Layers3, Plus, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceData } from "./types";

interface ProjectNavigationProps {
  data: WorkspaceData;
  activeRevisionId: string;
  activePanel: "canvas" | "audit" | "settings" | "activity";
  onPanelChange: (panel: "canvas" | "audit" | "settings" | "activity") => void;
  onRevisionChange: (revisionId: string) => void;
  onRunPageAudit: () => void;
  isAuditPending: boolean;
}

export function ProjectNavigation({ data, activeRevisionId, activePanel, onPanelChange, onRevisionChange, onRunPageAudit, isAuditPending }: ProjectNavigationProps) {
  return (
    <aside className="flex h-full w-[228px] shrink-0 flex-col border-r border-white/[0.07] bg-[#131312] text-zinc-400">
      <div className="border-b border-white/[0.07] px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 py-2">
          <div className="grid size-6 place-items-center rounded bg-zinc-800 text-zinc-300"><GitFork className="size-3.5" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-200">{data.project.repository}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-500"><GitBranch className="size-2.5" /> {data.project.branch}</p>
          </div>
          <ChevronRight className="size-3.5 text-zinc-600" />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2 py-3">
        <p className="px-2 pb-2 text-[10px] font-semibold tracking-[0.12em] text-zinc-600 uppercase">Workspace</p>
        <nav className="space-y-0.5">
          <button
            type="button"
            onClick={() => onPanelChange("canvas")}
            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors", activePanel === "canvas" ? "bg-[#d7ff64]/[0.1] text-[#e4ff9d]" : "hover:bg-white/[0.05] hover:text-zinc-200")}
          >
            <Layers3 className="size-3.5" /> Current canvas
          </button>
          <button
            type="button"
            onClick={() => {
              onPanelChange("audit");
              onRunPageAudit();
            }}
            disabled={isAuditPending}
            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors disabled:opacity-50", activePanel === "audit" ? "bg-white/[0.07] text-zinc-100" : "hover:bg-white/[0.05] hover:text-zinc-200")}
          >
            <CircleDot className={cn("size-3.5", isAuditPending && "animate-pulse")} /> {isAuditPending ? "Auditing…" : "Page audit"}
          </button>
          <button
            type="button"
            onClick={() => onPanelChange("settings")}
            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors", activePanel === "settings" ? "bg-white/[0.07] text-zinc-100" : "hover:bg-white/[0.05] hover:text-zinc-200")}
          >
            <Settings2 className="size-3.5" /> Project settings
          </button>
        </nav>

        <div className="mt-7">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-600 uppercase">Revisions</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Create revision" className="text-zinc-500 transition-colors hover:text-zinc-200"><Plus className="size-3.5" /></button>
              </TooltipTrigger>
              <TooltipContent>Create revision from an accepted suggestion</TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-1">
            {data.revisions.map((revision) => {
              const isActive = revision.id === activeRevisionId;
              return (
                <button
                  key={revision.id}
                  type="button"
                  onClick={() => onRevisionChange(revision.id)}
                  className={cn("group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors", isActive ? "bg-white/[0.07] text-zinc-100" : "hover:bg-white/[0.04] hover:text-zinc-200")}
                >
                  <span className={cn("mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border", isActive ? "border-[#d7ff64] bg-[#d7ff64] text-[#1a1c16]" : "border-zinc-700 text-transparent")}><Check className="size-2.5 stroke-[3]" /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{revision.label}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-zinc-500">{revision.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-white/[0.07] p-2.5">
        <Button variant="ghost" size="sm" onClick={() => onPanelChange("activity")} className={cn("w-full justify-start text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200", activePanel === "activity" && "bg-white/[0.07] text-zinc-100")}>
          <History /> Activity · 12 changes
        </Button>
      </div>
    </aside>
  );
}
