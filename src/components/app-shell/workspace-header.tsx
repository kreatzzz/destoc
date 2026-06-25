import { Loader2 } from "lucide-react";

import { AnimatedDeleteIcon } from "@/components/ui/animated-icons";
import { DestocLogo } from "@/components/app-shell/destoc-logo";
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
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceProject } from "@/components/workspace/types";

interface WorkspaceHeaderProps {
  project: WorkspaceProject;
  previewStatusText: string;
  previewError: string | null;
  isPreviewStarting: boolean;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}

export function WorkspaceHeader({
  project,
  previewStatusText,
  previewError,
  isPreviewStarting,
  onDisconnect,
  isDisconnecting,
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

      <div className="flex min-w-0 items-center justify-center">
        <div className="flex max-w-[42vw] items-center gap-2 rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400">
          <span className={cn("size-1.5 shrink-0 rounded-full", previewError ? "bg-rose-400" : isPreviewStarting ? "bg-amber-300" : "bg-[#f7ca58]")} />
          <span className="truncate">{previewStatusText}</span>
          {isPreviewStarting ? <Loader2 className="size-3 animate-spin text-zinc-500" /> : null}
        </div>
      </div>

      <div className="flex justify-end">
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete project"
                  disabled={isDisconnecting}
                  className="text-zinc-500 hover:bg-rose-500/10 hover:text-rose-200"
                >
                  {isDisconnecting ? <Loader2 className="animate-spin" /> : <AnimatedDeleteIcon size={14} />}
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
                This removes {project.repository} from Destoc, including its saved reviews and revisions. It will not touch the GitHub repository.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isDisconnecting}
                onClick={onDisconnect}
              >
                {isDisconnecting ? "Deleting…" : "Delete project"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
}
