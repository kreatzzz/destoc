import { Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WorkspaceProject } from "@/components/workspace/types";

interface WorkspaceHeaderProps {
  project: WorkspaceProject;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}

export function WorkspaceHeader({ project, onDisconnect, isDisconnecting }: WorkspaceHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#111110] px-3 text-zinc-300">
      <div className="flex min-w-0 items-center gap-2">
        <div className="grid size-7 place-items-center rounded-md bg-[#d7ff64] text-[#171916] shadow-[0_0_20px_rgba(215,255,100,0.14)]">
          <Sparkles className="size-3.5 fill-current" />
        </div>
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <span className="text-sm font-semibold tracking-[-0.03em] text-zinc-100">Destoc</span>
          <span className="text-zinc-700">/</span>
          <span className="max-w-56 truncate text-sm text-zinc-400">{project.name}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={isDisconnecting}
          onClick={onDisconnect}
          className="gap-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-200"
        >
          <Trash2 className="size-3.5" />
          {isDisconnecting ? "Deleting…" : "Delete project"}
        </Button>
      </div>
    </header>
  );
}
