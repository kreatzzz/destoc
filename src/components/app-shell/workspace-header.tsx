import { Loader2, Square } from "lucide-react";

import { DestocLogo } from "@/components/app-shell/destoc-logo";
import { AnimatedPanelLeftCloseIcon, AnimatedPanelRightOpenIcon, AnimatedRotateCcwIcon } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspaceLogoutButton } from "@/components/workspace/workspace-logout-button";
import { cn } from "@/lib/utils";
import type { WorkspaceProject } from "@/components/workspace/types";

interface WorkspaceHeaderProps {
  project: WorkspaceProject;
  previewStatusText: string;
  previewError: string | null;
  isPreviewStarting: boolean;
  onRestartSandbox: () => void;
  onStopSandbox: () => void;
  canStopSandbox: boolean;
  isStoppingSandbox: boolean;
  onToggleCodePane: () => void;
  codePaneOpen: boolean;
  hasCodeChanges: boolean;
}

export function WorkspaceHeader({
  project,
  previewStatusText,
  previewError,
  isPreviewStarting,
  onRestartSandbox,
  onStopSandbox,
  canStopSandbox,
  isStoppingSandbox,
  onToggleCodePane,
  codePaneOpen,
  hasCodeChanges,
}: WorkspaceHeaderProps) {
  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-white/[0.07] bg-[#111110] px-3 text-zinc-300">
      <div className="flex min-w-0 items-center gap-2">
        <DestocLogo className="h-7 min-w-7" markClassName="text-[19px]" />
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <span className="text-sm font-semibold tracking-[-0.03em] text-zinc-100">Destoc</span>
          <span className="text-zinc-700">/</span>
          <span className="max-w-56 truncate text-sm text-zinc-400">{project.name}</span>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Restart sandbox"
              disabled={isPreviewStarting}
              onClick={onRestartSandbox}
              className="grid place-items-center text-zinc-500 hover:bg-white/[0.06] hover:text-[#ffd879]"
            >
              <AnimatedRotateCcwIcon size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Restart sandbox</TooltipContent>
        </Tooltip>
        <div className="flex max-w-[42vw] items-center gap-2 rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400">
          <span className={cn("size-1.5 shrink-0 rounded-full", previewError ? "bg-rose-400" : isPreviewStarting ? "bg-amber-300" : "bg-[#f7ca58]")} />
          <span className="truncate">{previewStatusText}</span>
          {isPreviewStarting ? <Loader2 className="size-3 animate-spin text-zinc-500" /> : null}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Stop sandbox"
              disabled={!canStopSandbox || isStoppingSandbox}
              onClick={onStopSandbox}
              className="grid place-items-center text-zinc-500 hover:bg-white/[0.06] hover:text-rose-200"
            >
              {isStoppingSandbox ? <Loader2 className="animate-spin" /> : <Square className="size-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop sandbox</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex h-full items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={codePaneOpen ? "Hide code changes" : "Show code changes"}
              onClick={onToggleCodePane}
              className={cn(
                "relative grid size-9 place-items-center rounded-xl p-0 text-zinc-500 hover:bg-white/[0.06] hover:text-[#ffd879]",
                codePaneOpen && "bg-white/[0.06] text-[#ffd879]",
              )}
            >
              <span className="pointer-events-none grid size-5 place-items-center">
                {codePaneOpen ? <AnimatedPanelLeftCloseIcon size={16} /> : <AnimatedPanelRightOpenIcon size={16} />}
              </span>
              {hasCodeChanges ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#f7ca58]" /> : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{codePaneOpen ? "Hide code changes" : "Show code changes"}</TooltipContent>
        </Tooltip>
        <WorkspaceLogoutButton />
      </div>
    </header>
  );
}
