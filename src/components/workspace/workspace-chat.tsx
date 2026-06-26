"use client";

import { Loader2 } from "lucide-react";

import { AnimatedArrowUpIcon, AnimatedXIcon } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceChatMessage, WorkspaceSelectedElement, WorkspaceSuggestion } from "./types";

interface WorkspaceChatProps {
  selectedElements: WorkspaceSelectedElement[];
  activeSelectionSelector: string | null;
  messages: WorkspaceChatMessage[];
  suggestions: WorkspaceSuggestion[];
  prompt: string;
  isAuditPending: boolean;
  auditError: string | null;
  pendingSuggestionId: string | null;
  onPromptChange: (value: string) => void;
  onSendPrompt: () => void;
  onAcceptSuggestion: (suggestionId: string) => void;
  onRejectSuggestion: (suggestionId: string) => void;
  onRemoveSelection: (selector: string) => void;
  onActiveSelectionChange: (selector: string) => void;
  onSelectionNoteChange: (selector: string, note: string) => void;
}

function elementLabel(element: WorkspaceSelectedElement) {
  if (element.role) return element.role;
  const text = element.text?.trim();
  if (text) return text.slice(0, 28);
  return element.selector.split(">").at(-1)?.trim() ?? element.selector;
}

const visibleSelectionLimit = 3;

export function WorkspaceChat({
  selectedElements,
  activeSelectionSelector,
  messages,
  suggestions,
  prompt,
  isAuditPending,
  auditError,
  pendingSuggestionId,
  onPromptChange,
  onSendPrompt,
  onAcceptSuggestion,
  onRejectSuggestion,
  onRemoveSelection,
  onActiveSelectionChange,
  onSelectionNoteChange,
}: WorkspaceChatProps) {
  const hasSelectedElementNotes = selectedElements.some((element) => Boolean(element.note?.trim()));
  const canSend = (prompt.trim().length > 0 || hasSelectedElementNotes) && !isAuditPending;
  const visibleSelections = selectedElements.slice(-visibleSelectionLimit);
  const hiddenSelectionCount = Math.max(0, selectedElements.length - visibleSelections.length);
  const activeSelection = selectedElements.find((element) => element.selector === activeSelectionSelector)
    ?? selectedElements.at(-1)
    ?? null;
  const activeSelectionNumber = activeSelection
    ? selectedElements.findIndex((element) => element.selector === activeSelection.selector) + 1
    : 0;

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-r border-white/[0.07] bg-[#111110] text-zinc-200">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("rounded-lg px-3 py-2.5 text-sm leading-6", message.role === "user" ? "ml-8 bg-[#f7ca58] text-[#1b1205]" : "mr-8 bg-white/[0.04] text-zinc-300")}>
            {message.content}
          </div>
        ))}
        {suggestions.length ? (
          <div className="space-y-2">
            {suggestions.map((suggestion) => {
              const isPending = pendingSuggestionId === suggestion.id;
              const hasPatch = Boolean(suggestion.patch?.trim());

              return (
                <article key={suggestion.id} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 text-sm text-zinc-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-100">{suggestion.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{suggestion.impact} · {suggestion.status}</p>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px]",
                      hasPatch ? "bg-[#f7ca58]/15 text-[#ffd879]" : "bg-white/[0.06] text-zinc-500",
                    )}>
                      {hasPatch ? "patch" : "copy"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">{suggestion.summary}</p>
                  {suggestion.patch ? (
                    <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-black/30 p-2 text-[10px] leading-4 text-zinc-300">
                      <code>{suggestion.patch}</code>
                    </pre>
                  ) : (
                    <p className="mt-3 rounded-lg bg-black/20 p-2 text-xs leading-5 text-zinc-400">
                      No safe patch was returned. Use the rationale as implementation copy until source-file mapping is added.
                    </p>
                  )}
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
                        disabled={!hasPatch || isPending}
                        onClick={() => onAcceptSuggestion(suggestion.id)}
                        className="h-8 bg-[#f7ca58] text-[#1b1205] hover:bg-[#ffd879]"
                      >
                        {isPending ? "Working…" : hasPatch ? "Accept patch" : "Needs source"}
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
        {auditError ? <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-200">{auditError}</p> : null}
      </div>

      <div className="p-3">
        <div className="mb-2 min-h-7">
          {selectedElements.length ? (
            <div className="flex max-w-full items-center gap-1.5 overflow-hidden">
              {visibleSelections.map((element) => (
                <span
                  key={element.selector}
                  className={cn(
                    "group inline-flex min-w-0 max-w-[112px] items-center justify-center gap-1.5 rounded-full px-1 py-1 text-center text-[11px] transition-[background-color,color,box-shadow] duration-150",
                    activeSelection?.selector === element.selector
                      ? "bg-[#f7ca58] text-[#1b1205] shadow-[0_0_18px_rgba(247,202,88,0.14)]"
                      : "bg-[#f7ca58]/10 text-[#ffd879] hover:bg-[#f7ca58]/15",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onActiveSelectionChange(element.selector)}
                    className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1.5 text-current"
                  >
                    <span className="shrink-0 font-mono font-semibold tabular-nums">{selectedElements.findIndex((candidate) => candidate.selector === element.selector) + 1}</span>
                    <span className="min-w-0 truncate">{elementLabel(element)}</span>
                  </button>
                  {element.note?.trim() ? <span className="size-1 shrink-0 rounded-full bg-current opacity-70" /> : null}
                  <button
                    type="button"
                    aria-label={`Remove ${elementLabel(element)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveSelection(element.selector);
                    }}
                    className="inline-flex size-3.5 shrink-0 items-center justify-center text-current/60 transition-colors hover:text-current"
                  >
                    <AnimatedXIcon size={12} />
                  </button>
                </span>
              ))}
              {hiddenSelectionCount ? (
                <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-white/[0.07] px-2 py-1 text-[11px] text-zinc-400">
                  +{hiddenSelectionCount}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="px-1 text-xs leading-7 text-zinc-600">Select components to attach context.</p>
          )}
        </div>
        {activeSelection ? (
          <div className="mb-2 rounded-xl bg-white/[0.035] p-2">
            <div className="mb-1.5 flex items-center justify-between gap-2 px-1 text-[11px] text-zinc-500">
              <span className="truncate">
                Note for <span className="font-mono tabular-nums text-[#f7ca58]">#{activeSelectionNumber}</span> {elementLabel(activeSelection)}
              </span>
              <span className="shrink-0 text-zinc-600">saved</span>
            </div>
            <Textarea
              value={activeSelection.note ?? ""}
              onChange={(event) => onSelectionNoteChange(activeSelection.selector, event.target.value)}
              placeholder="Add what should change or what to review here…"
              className="max-h-24 min-h-16 resize-none border-0 bg-transparent px-2 py-2 text-xs leading-5 text-zinc-100 shadow-none placeholder:text-zinc-600 focus-visible:ring-0"
            />
          </div>
        ) : null}
        <div className="rounded-xl bg-black/20 p-2">
          <Textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                if (canSend) onSendPrompt();
              }
            }}
            placeholder={hasSelectedElementNotes ? "Optional: add extra direction for these notes…" : "Ask for a design audit or targeted improvement…"}
            className="max-h-40 min-h-24 resize-none border-0 bg-transparent px-2 py-2 text-sm text-zinc-100 shadow-none placeholder:text-zinc-600 focus-visible:ring-0"
          />
          <div className="flex items-center justify-between px-1 pt-1">
            <p className="text-[10px] text-zinc-600">⌘ Enter to send</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" aria-label="Send prompt" disabled={!canSend} onClick={onSendPrompt} className="bg-[#f7ca58] text-[#1b1205] hover:bg-[#ffd879]">
                  {isAuditPending ? <Loader2 className="animate-spin" /> : <AnimatedArrowUpIcon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send prompt</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </aside>
  );
}
