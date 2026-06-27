"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { Loader2 } from "lucide-react";

import { AnimatedArrowUpIcon, AnimatedXIcon } from "@/components/ui/animated-icons";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageContent,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceChatMessage, WorkspaceSelectedElement, WorkspaceSuggestion } from "./types";

interface WorkspaceChatProps {
  width: number;
  onWidthChange: (width: number) => void;
  selectedElements: WorkspaceSelectedElement[];
  activeSelectionId: string | null;
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
  onRemoveSelection: (selectionId: string) => void;
  onActiveSelectionChange: (selectionId: string) => void;
  onSelectionNoteChange: (selectionId: string, note: string) => void;
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
  activeSelectionId,
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
  const activeSelection = selectedElements.find((element) => element.id === activeSelectionId)
    ?? selectedElements.at(-1)
    ?? null;
  const activeSelectionNumber = activeSelection
    ? selectedElements.findIndex((element) => element.id === activeSelection.id) + 1
    : 0;
  const changeSuggestions = suggestions.filter((suggestion) => suggestion.patch?.trim() && suggestion.status === "pending");

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
      className="relative flex h-full shrink-0 flex-col border-r border-white/[0.07] bg-[#10100f] text-zinc-200 shadow-[inset_-1px_0_0_rgba(255,255,255,0.025)]"
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat"
        onPointerDown={startResize}
        className="absolute right-0 top-0 z-20 h-full w-2 cursor-col-resize touch-none bg-transparent transition-[background-color] duration-150 hover:bg-[#f7ca58]/20"
      />
      <MessageScrollerProvider>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport className="px-4 py-4">
            <MessageScrollerContent className="gap-2.5">
              {messages.map((chatMessage) => {
                const isUser = chatMessage.role === "user";

                return (
                  <MessageScrollerItem key={chatMessage.id}>
                    <Message align={isUser ? "end" : "start"}>
                      <MessageContent>
                        <Bubble align={isUser ? "end" : "start"} variant={isUser ? "default" : "muted"} className={cn("max-w-[92%]", isUser ? "ml-auto" : "mr-auto")}>
                          <BubbleContent
                            className={cn(
                              "border-0 px-3 py-2 text-sm leading-6 shadow-none",
                              isUser
                                ? "rounded-[16px_16px_4px_16px] bg-[#f7ca58] text-[#1b1205] shadow-[0_8px_22px_rgba(247,202,88,0.10)]"
                                : "rounded-[16px_16px_16px_4px] bg-white/[0.035] text-zinc-300 shadow-[inset_3px_0_0_rgba(247,202,88,0.52),inset_0_0_0_1px_rgba(255,255,255,0.035)]",
                            )}
                          >
                            <span className={cn(
                              "mb-1 block text-[10px] font-medium uppercase tracking-[0.16em]",
                              isUser ? "text-[#5f4210]" : "text-[#f7ca58]",
                            )}>
                              {isUser ? "You" : "Destoc"}
                            </span>
                            <p className="whitespace-pre-wrap text-pretty">{chatMessage.content}</p>
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                );
              })}
              {changeSuggestions.map((suggestion) => {
                const isPending = pendingSuggestionId === suggestion.id;

                return (
                  <MessageScrollerItem key={suggestion.id}>
                    <Message align="start">
                      <MessageContent>
                        <Bubble variant="muted" className="max-w-[94%]">
                          <BubbleContent className="rounded-2xl border-0 bg-[#171715] p-3 text-sm text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                            <div className="flex items-start gap-3">
                              <span className={cn(
                                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold tabular-nums",
                                "bg-[#f7ca58] text-[#1b1205]",
                              )}>
                                {changeSuggestions.findIndex((candidate) => candidate.id === suggestion.id) + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-5 text-zinc-100 text-pretty">{suggestion.title}</p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500 text-pretty">{suggestion.summary}</p>
                              </div>
                            </div>

                            {suggestion.status === "pending" ? (
                              <div className="mt-3 flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() => onRejectSuggestion(suggestion.id)}
                                  className="h-8 min-w-10 px-3 text-zinc-400 transition-[color,background-color,scale] duration-150 active:scale-[0.96] hover:text-zinc-100"
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => onAcceptSuggestion(suggestion.id)}
                                  className="h-8 min-w-10 bg-[#f7ca58] px-3 text-[#1b1205] transition-[background-color,scale] duration-150 active:scale-[0.96] hover:bg-[#ffd879]"
                                >
                                  {isPending ? "Applying…" : "Accept"}
                                </Button>
                              </div>
                            ) : null}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                );
              })}
              {isAuditPending ? (
                <MessageScrollerItem scrollAnchor>
                  <Message align="start">
                    <MessageContent>
                      <Bubble variant="muted" className="max-w-[92%]">
                        <BubbleContent className="rounded-xl border-0 bg-white/[0.035] px-3 py-2 text-sm leading-6 text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]">
                          <span className="inline-flex items-center gap-2">
                            <span className="text-zinc-500">Drafting code</span>
                            <span className="inline-flex items-center gap-1">
                              <span className="size-1.5 animate-bounce rounded-full bg-[#f7ca58] [animation-delay:-160ms]" />
                              <span className="size-1.5 animate-bounce rounded-full bg-[#f7ca58] [animation-delay:-80ms]" />
                              <span className="size-1.5 animate-bounce rounded-full bg-[#f7ca58]" />
                            </span>
                          </span>
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ) : null}
              {auditError ? (
                <MessageScrollerItem scrollAnchor>
                  <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-200">
                    {auditError}
                  </p>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton className="bottom-3 border-white/10 bg-[#171715] text-[#f7ca58] hover:bg-[#1f1f1c]" />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="p-3">
        <div className="mb-2 min-h-7">
          {selectedElements.length ? (
            <div className="flex max-w-full items-center gap-1.5 overflow-hidden">
              {visibleSelections.map((element) => (
                <span
                  key={element.id}
                  className={cn(
                    "group inline-flex min-w-0 max-w-[112px] items-center justify-center gap-1.5 rounded-full px-1 py-1 text-center text-[11px] transition-[background-color,color,box-shadow] duration-150",
                    activeSelection?.id === element.id
                      ? "bg-[#f7ca58] text-[#1b1205] shadow-[0_0_18px_rgba(247,202,88,0.14)]"
                      : "bg-[#f7ca58]/10 text-[#ffd879] hover:bg-[#f7ca58]/15",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onActiveSelectionChange(element.id)}
                    className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1.5 text-current"
                  >
                    <span className="shrink-0 font-mono font-semibold tabular-nums">{selectedElements.findIndex((candidate) => candidate.id === element.id) + 1}</span>
                    <span className="min-w-0 truncate">{elementLabel(element)}</span>
                  </button>
                  {element.note?.trim() ? <span className="size-1 shrink-0 rounded-full bg-current opacity-70" /> : null}
                  <button
                    type="button"
                    aria-label={`Remove ${elementLabel(element)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveSelection(element.id);
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
          <div className="mb-2 rounded-2xl bg-white/[0.028] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
            <div className="mb-1.5 flex items-center justify-between gap-2 px-1 text-[11px] text-zinc-500">
              <span className="truncate">
                Note for <span className="font-mono tabular-nums text-[#f7ca58]">#{activeSelectionNumber}</span> {elementLabel(activeSelection)}
              </span>
              <span className="shrink-0 text-zinc-600">saved</span>
            </div>
            <Textarea
              value={activeSelection.note ?? ""}
              onChange={(event) => onSelectionNoteChange(activeSelection.id, event.target.value)}
              placeholder="Add what should change or what to review here…"
              className="max-h-24 min-h-14 resize-none rounded-xl border-0 bg-black/20 px-3 py-2 text-xs leading-5 text-zinc-100 shadow-none placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#f7ca58]/20"
            />
          </div>
        ) : null}
        <div className="rounded-2xl bg-[#171715] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.28),inset_0_0_0_1px_rgba(255,255,255,0.075)]">
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
            className="max-h-36 min-h-16 resize-none rounded-xl border-0 bg-transparent px-2.5 py-1.5 text-sm leading-6 text-zinc-100 shadow-none placeholder:text-zinc-600 focus-visible:ring-0"
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
