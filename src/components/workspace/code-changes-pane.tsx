import { X } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { AnimatedFilePenLineIcon } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import type { WorkspaceSuggestion } from "./types";

interface CodeChangesPaneProps {
  width: number;
  onWidthChange: (width: number) => void;
  suggestions: WorkspaceSuggestion[];
  onClose: () => void;
}

const minCodePaneWidth = 340;
const maxCodePaneWidth = 720;

function clampWidth(width: number) {
  return Math.min(maxCodePaneWidth, Math.max(minCodePaneWidth, width));
}

export function CodeChangesPane({
  width,
  onWidthChange,
  suggestions,
  onClose,
}: CodeChangesPaneProps) {
  const patchSuggestions = suggestions.filter((suggestion) => suggestion.patch?.trim());

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onPointerMove = (moveEvent: PointerEvent) => {
      onWidthChange(clampWidth(startWidth + startX - moveEvent.clientX));
    };

    const onPointerUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }

  return (
    <aside className="relative flex h-full w-full shrink-0 flex-col border-l border-white/[0.07] bg-[#111110] text-zinc-200 shadow-[-20px_0_60px_rgba(0,0,0,0.22)]">
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize code changes"
        onPointerDown={startResize}
        className="absolute left-0 top-0 z-20 h-full w-2 cursor-col-resize touch-none bg-transparent transition-[background-color] duration-150 hover:bg-[#f7ca58]/20"
      />
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100">Code changes</p>
          <p className="text-xs text-zinc-600">{patchSuggestions.length} drafted</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close code changes" onClick={onClose} className="text-zinc-500 hover:text-zinc-100">
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
        {patchSuggestions.length ? patchSuggestions.map((suggestion) => {
          return (
            <article key={suggestion.id} className="rounded-2xl bg-white/[0.035] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              <pre className="max-h-[640px] overflow-auto rounded-xl bg-black/35 p-3 text-[11px] leading-5 text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                <code>{suggestion.patch}</code>
              </pre>
            </article>
          );
        }) : (
          <div className="flex min-h-60 items-center justify-center rounded-2xl bg-white/[0.025] px-6 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
            <div className="max-w-52">
              <span className="mx-auto grid size-10 place-items-center rounded-xl bg-[#f7ca58]/10 text-[#f7ca58] shadow-[inset_0_0_0_1px_rgba(247,202,88,0.12)]">
                <AnimatedFilePenLineIcon size={18} />
              </span>
              <p className="mt-3 text-sm font-medium text-zinc-200">No code changes yet</p>
              <p className="mt-1 text-pretty text-xs leading-5 text-zinc-500">
                Select an element in the preview and ask Destoc to improve it. Generated diffs will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
