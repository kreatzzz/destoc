import { Bell, ChevronDown, Cloud, MoreHorizontal, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceProject } from "@/components/workspace/types";

interface WorkspaceHeaderProps {
  project: WorkspaceProject;
}

export function WorkspaceHeader({ project }: WorkspaceHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#111110] px-3 text-zinc-300">
      <div className="flex min-w-0 items-center gap-2">
        <div className="grid size-7 place-items-center rounded-md bg-[#d7ff64] text-[#171916] shadow-[0_0_20px_rgba(215,255,100,0.14)]">
          <Sparkles className="size-3.5 fill-current" />
        </div>
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <span className="text-sm font-semibold tracking-[-0.03em] text-zinc-100">Destoc</span>
          <span className="text-zinc-700">/</span>
          <button className="flex max-w-56 items-center gap-1.5 truncate text-sm text-zinc-400 transition-colors hover:text-zinc-100">
            <span className="truncate">{project.name}</span>
            <ChevronDown className="size-3.5 shrink-0" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Badge variant="outline" className="hidden border-emerald-400/20 bg-emerald-400/[0.07] text-[10px] font-medium text-emerald-300 sm:flex">
          <Cloud className="size-2.5" /> Preview live
        </Badge>
        <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100">
          <Bell />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="More options" className="text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100">
          <MoreHorizontal />
        </Button>
        <Avatar size="sm" className="ml-1 border border-white/10">
          <AvatarFallback className="bg-[#343832] text-[10px] font-semibold text-[#d7ff64]">AS</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
