"use client";

import { Loader2 } from "lucide-react";

import { AnimatedArrowUpIcon, AnimatedXIcon } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceChatMessage, WorkspaceSelectedElement } from "./types";

interface WorkspaceChatProps {
  selectedElements: WorkspaceSelectedElement[];
  messages: WorkspaceChatMessage[];
  prompt: string;
  isAuditPending: boolean;
  auditError: string | null;
  onPromptChange: (value: string) => void;
  onSendPrompt: () => void;
  onRemoveSelection: (selector: string) => void;
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
  messages,
  prompt,
  isAuditPending,
  auditError,
  onPromptChange,
  onSendPrompt,
  onRemoveSelection,
}: WorkspaceChatProps) {
  const canSend = prompt.trim().length > 0 && !isAuditPending;
  const visibleSelections = selectedElements.slice(0, visibleSelectionLimit);
  const hiddenSelectionCount = Math.max(0, selectedElements.length - visibleSelections.length);

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-r border-white/[0.07] bg-[#111110] text-zinc-200">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("px-3 py-2.5 text-sm leading-6", message.role === "user" ? "ml-8 bg-[#d7ff64] text-[#171916]" : "mr-8 bg-white/[0.04] text-zinc-300")}>
            {message.content}
          </div>
        ))}
        {auditError ? <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-200">{auditError}</p> : null}
      </div>

      <div className="p-3">
        <div className="mb-2 min-h-7">
          {selectedElements.length ? (
            <div className="flex max-w-full items-center gap-1.5 overflow-hidden">
              {visibleSelections.map((element) => (
                <span key={element.selector} className="group inline-flex min-w-0 max-w-[92px] items-center justify-center gap-1.5 rounded-full bg-[#d7ff64]/10 px-2.5 py-1 text-center text-[11px] text-[#e4ff9d]">
                  <span className="min-w-0 truncate">{elementLabel(element)}</span>
                  <button type="button" aria-label={`Remove ${elementLabel(element)}`} onClick={() => onRemoveSelection(element.selector)} className="-mr-0.5 inline-flex size-3.5 shrink-0 items-center justify-center text-[#e4ff9d]/60 transition-colors hover:text-[#e4ff9d]">
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
        <div className="bg-black/20 p-2">
          <Textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                if (canSend) onSendPrompt();
              }
            }}
            placeholder="Ask for a design audit or targeted improvement…"
            className="max-h-40 min-h-24 resize-none border-0 bg-transparent px-2 py-2 text-sm text-zinc-100 shadow-none placeholder:text-zinc-600 focus-visible:ring-0"
          />
          <div className="flex items-center justify-between px-1 pt-1">
            <p className="text-[10px] text-zinc-600">⌘ Enter to send</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" aria-label="Send prompt" disabled={!canSend} onClick={onSendPrompt} className="bg-[#d7ff64] text-[#171916] hover:bg-[#e3ff94]">
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
