import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WorkspaceSuggestion } from "./types";

interface CodeChangesPaneProps {
  suggestions: WorkspaceSuggestion[];
  pendingSuggestionId: string | null;
  onAcceptSuggestion: (suggestionId: string) => void;
  onRejectSuggestion: (suggestionId: string) => void;
  onClose: () => void;
}

export function CodeChangesPane({
  suggestions,
  pendingSuggestionId,
  onAcceptSuggestion,
  onRejectSuggestion,
  onClose,
}: CodeChangesPaneProps) {
  const patchSuggestions = suggestions.filter((suggestion) => suggestion.patch?.trim());

  return (
    <aside className="flex h-full w-[420px] shrink-0 flex-col border-l border-white/[0.07] bg-[#111110] text-zinc-200 shadow-[-20px_0_60px_rgba(0,0,0,0.22)]">
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
          const isPending = pendingSuggestionId === suggestion.id;

          return (
            <article key={suggestion.id} className="rounded-2xl bg-white/[0.045] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-5 text-zinc-100">{suggestion.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{suggestion.impact} · {suggestion.status}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#f7ca58]/15 px-2 py-0.5 text-[10px] text-[#ffd879]">diff</span>
              </div>

              <pre className="mt-3 max-h-[520px] overflow-auto rounded-xl bg-black/30 p-3 text-[11px] leading-5 text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                <code>{suggestion.patch}</code>
              </pre>

              {suggestion.status === "pending" ? (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => onRejectSuggestion(suggestion.id)}
                    className="h-8 text-zinc-400 hover:text-zinc-100"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => onAcceptSuggestion(suggestion.id)}
                    className="h-8 bg-[#f7ca58] text-[#1b1205] hover:bg-[#ffd879]"
                  >
                    {isPending ? "Working…" : "Accept diff"}
                  </Button>
                </div>
              ) : null}
            </article>
          );
        }) : (
          <div className="rounded-2xl bg-white/[0.035] p-4 text-sm leading-6 text-zinc-500">
            No code diff yet. Select a component and ask Destoc to change it.
          </div>
        )}
      </div>
    </aside>
  );
}
