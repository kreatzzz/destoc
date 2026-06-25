"use client";

import { ArrowUp, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceChatMessage, WorkspaceProject, WorkspaceSelectedElement } from "./types";

interface WorkspaceChatProps {
  project: WorkspaceProject;
  selectedElements: WorkspaceSelectedElement[];
  messages: WorkspaceChatMessage[];
  prompt: string;
  previewStatusText: string;
  previewError: string | null;
  isPreviewStarting: boolean;
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

export function WorkspaceChat({
  project,
  selectedElements,
  messages,
  prompt,
  previewStatusText,
  previewError,
  isPreviewStarting,
  isAuditPending,
  auditError,
  onPromptChange,
  onSendPrompt,
  onRemoveSelection,
}: WorkspaceChatProps) {
  const canSend = prompt.trim().length > 0 && !isAuditPending;

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-r border-white/[0.07] bg-[#111110] text-zinc-200">
      <div className="border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-[#d7ff64] text-[#171916] shadow-[0_0_20px_rgba(215,255,100,0.14)]">
            <Sparkles className="size-3.5 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.03em] text-zinc-100">{project.name}</p>
            <p className="truncate text-xs text-zinc-500">{project.repository}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs text-zinc-400">
          <span className={cn("size-1.5 shrink-0 rounded-full", previewError ? "bg-rose-400" : isPreviewStarting ? "bg-amber-300" : "bg-emerald-400")} />
          <span className="truncate">{previewStatusText}</span>
          {isPreviewStarting ? <Loader2 className="ml-auto size-3.5 animate-spin text-zinc-500" /> : null}
        </div>
        {previewError ? <p role="alert" className="mt-2 text-xs leading-5 text-rose-300">{previewError}</p> : null}
      </div>

      <div className="border-b border-white/[0.07] px-4 py-3">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-600 uppercase">Selected components</p>
        {selectedElements.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedElements.map((element) => (
              <span key={element.selector} className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#d7ff64]/20 bg-[#d7ff64]/10 px-2.5 py-1 text-[11px] text-[#e4ff9d]">
                <span className="truncate">{elementLabel(element)}</span>
                <button type="button" aria-label={`Remove ${elementLabel(element)}`} onClick={() => onRemoveSelection(element.selector)} className="text-[#e4ff9d]/60 transition-colors hover:text-[#e4ff9d]">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-zinc-500">Use Select in the preview, then click components to build context for your prompt.</p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("rounded-xl px-3 py-2.5 text-sm leading-6", message.role === "user" ? "ml-8 bg-[#d7ff64] text-[#171916]" : "mr-8 border border-white/[0.07] bg-white/[0.04] text-zinc-300")}>
            {message.content}
          </div>
        ))}
        {auditError ? <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-200">{auditError}</p> : null}
      </div>

      <div className="border-t border-white/[0.07] p-3">
        <div className="rounded-xl border border-white/[0.09] bg-black/20 p-2">
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
                  {isAuditPending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
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
