import { Check, ChevronDown, Code2, Lightbulb, MessageSquareText, MoreHorizontal, MousePointer2, RotateCcw, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { WorkspaceSuggestion } from "./types";

interface ReviewInspectorProps {
  suggestion: WorkspaceSuggestion | null;
  onSuggestionStatusChange: (status: "accepted" | "rejected") => void;
  isDecisionPending: boolean;
  decisionError: string | null;
}

const impactClasses = { "High impact": "border-amber-300/15 bg-amber-300/[0.09] text-amber-200", "Medium impact": "border-sky-300/15 bg-sky-300/[0.08] text-sky-200", "Low impact": "border-zinc-500/20 bg-zinc-500/[0.1] text-zinc-400" };

export function ReviewInspector({ suggestion, onSuggestionStatusChange, isDecisionPending, decisionError }: ReviewInspectorProps) {
  if (!suggestion) {
    return (
      <aside className="flex h-full w-[330px] shrink-0 flex-col border-l border-white/[0.07] bg-[#131312] text-zinc-300">
        <div className="flex h-11 items-center border-b border-white/[0.07] px-3 text-xs font-medium text-zinc-200"><Sparkles className="mr-1.5 size-3.5 text-[#d7ff64]" /> Design review</div>
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <div className="mx-auto grid size-9 place-items-center rounded-lg bg-white/[0.05] text-zinc-500"><MousePointer2 className="size-4" /></div>
            <h2 className="mt-3 text-sm font-medium text-zinc-200">Nothing selected</h2>
            <p className="mt-1.5 text-xs leading-5 text-zinc-500">Turn on design mode, select a component in the preview, then run a focused review.</p>
          </div>
        </div>
      </aside>
    );
  }
  const isResolved = suggestion.status !== "pending";
  return (
    <aside className="flex h-full w-[330px] shrink-0 flex-col border-l border-white/[0.07] bg-[#131312] text-zinc-300">
      <div className="flex h-11 items-center justify-between border-b border-white/[0.07] px-3">
        <div className="flex items-center gap-1 text-xs font-medium text-zinc-200"><Sparkles className="size-3.5 text-[#d7ff64]" /> Design review</div>
        <Button variant="ghost" size="icon-xs" aria-label="Review options" className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"><MoreHorizontal /></Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-3">
          <section className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-600 uppercase">Selected element</p><p className="mt-1 text-xs font-medium text-zinc-200">hero / heading</p></div>
              <Button variant="ghost" size="icon-xs" className="text-zinc-500"><ChevronDown /></Button>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md bg-black/20 px-2.5 py-2 font-mono text-[10px] text-zinc-500"><span>h1.display-hero</span><Code2 className="size-3" /></div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-600 uppercase">Active suggestion</p><Badge variant="outline" className={cn("text-[10px]", impactClasses[suggestion.impact])}>{suggestion.impact}</Badge></div>
            <div className="rounded-lg border border-white/[0.1] bg-gradient-to-b from-white/[0.055] to-white/[0.02] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
              <div className="flex gap-2"><div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-[#d7ff64]/10 text-[#d7ff64]"><Lightbulb className="size-3.5" /></div><div><h2 className="text-sm font-medium tracking-[-0.02em] text-zinc-100">{suggestion.title}</h2><p className="mt-1.5 text-xs leading-5 text-zinc-400">{suggestion.summary}</p></div></div>
              <div className="mt-4 border-t border-white/[0.07] pt-3"><p className="text-[10px] font-semibold tracking-[0.1em] text-zinc-600 uppercase">Why this matters</p><p className="mt-1.5 text-xs leading-5 text-zinc-500">{suggestion.rationale}</p></div>
              {!isResolved ? <><div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" disabled={isDecisionPending} onClick={() => onSuggestionStatusChange("accepted")} className="bg-[#d7ff64] text-[#191b16] hover:bg-[#e3ff94]"><Check /> {isDecisionPending ? "Applying…" : "Apply"}</Button><Button size="sm" variant="outline" disabled={isDecisionPending} onClick={() => onSuggestionStatusChange("rejected")} className="border-white/[0.1] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-white"><X /> Dismiss</Button></div>{decisionError ? <p role="alert" className="mt-3 text-xs leading-5 text-rose-300">{decisionError}</p> : null}</> : <div className={cn("mt-4 flex items-center gap-2 rounded-md px-2.5 py-2 text-xs", suggestion.status === "accepted" ? "bg-emerald-400/[0.08] text-emerald-300" : "bg-zinc-500/[0.1] text-zinc-400")}><Check className="size-3.5" /> {suggestion.status === "accepted" ? "Draft revision queued" : "Suggestion dismissed"}</div>}
            </div>
          </section>

          <section><div className="mb-2 flex items-center gap-1.5"><MessageSquareText className="size-3.5 text-zinc-600" /><p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-600 uppercase">Review thread</p></div><div className="space-y-2"><ThreadMessage initials="AI" name="Design reviewer" time="Now" text="I found three high-confidence opportunities on this page. This heading is the clearest place to start." accent /><ThreadMessage initials="AS" name="You" time="2m" text="Focus on clarity before changing the visual direction." /></div></section>
        </div>
      </ScrollArea>
      <div className="border-t border-white/[0.07] p-2.5"><Button variant="ghost" size="sm" className="w-full justify-start text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"><RotateCcw /> Run a new audit</Button></div>
    </aside>
  );
}

function ThreadMessage({ initials, name, time, text, accent = false }: { initials: string; name: string; time: string; text: string; accent?: boolean }) { return <div className="flex gap-2"><div className={cn("grid size-5 shrink-0 place-items-center rounded text-[8px] font-bold", accent ? "bg-[#d7ff64] text-[#1b1c17]" : "bg-zinc-700 text-zinc-200")}>{initials}</div><div className="min-w-0"><div className="flex items-center gap-1.5"><span className="text-[10px] font-medium text-zinc-300">{name}</span><span className="text-[10px] text-zinc-600">{time}</span></div><p className="mt-1 text-[11px] leading-4 text-zinc-500">{text}</p></div></div>; }
