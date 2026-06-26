"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { Loader2 } from "lucide-react";

import { AnimatedArrowUpIcon, AnimatedXIcon } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceChatMessage, WorkspaceSelectedElement } from "./types";

interface WorkspaceChatProps {
  width: number;
  onWidthChange: (width: number) => void;
  selectedElements: WorkspaceSelectedElement[];
  activeSelectionSelector: string | null;
  messages: WorkspaceChatMessage[];
  prompt: string;
  isAuditPending: boolean;
  auditError: string | null;
  onPromptChange: (value: string) => void;
  onSendPrompt: () => void;
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
const minChatWidth = 300;
const maxChatWidth = 560;

function clampWidth(width: number) {
  return Math.min(maxChatWidth, Math.max(minChatWidth, width));
}

export function WorkspaceChat({
  width,
  onWidthChange,
  selectedElements,
  activeSelectionSelector,
  messages,
  prompt,
  isAuditPending,
  auditError,
  onPromptChange,
  onSendPrompt,
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

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onPointerMove = (moveEvent: PointerEvent) => {
      onWidthChange(clampWidth(startWidth + moveEvent.clientX - startX));
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
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-white/[0.07] bg-[#111110] text-zinc-200"
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat"
        onPointerDown={startResize}
        className="absolute right-0 top-0 z-20 h-full w-2 cursor-col-resize touch-none bg-transparent transition-[background-color] duration-150 hover:bg-[#f7ca58]/20"
      />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("rounded-lg px-3 py-2.5 text-sm leading-6", message.role === "user" ? "ml-8 bg-[#f7ca58] text-[#1b1205]" : "mr-8 bg-white/[0.04] text-zinc-300")}>
            {message.content}
          </div>
        ))}
        {isAuditPending ? (
          <div className="mr-8 inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2.5 text-sm leading-6 text-zinc-300">
            <span className="text-zinc-500">Drafting code</span>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#f7ca58] [animation-delay:-160ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#f7ca58] [animation-delay:-80ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#f7ca58]" />
            </span>
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
