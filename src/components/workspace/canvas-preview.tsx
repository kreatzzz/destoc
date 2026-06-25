"use client";

import { useEffect, useMemo, useRef } from "react";
import { Loader2, MousePointer2 } from "lucide-react";
import type { CursorClickIconHandle, EyeIconHandle } from "lucide-animated";

import { AnimatedCursorClickIcon, AnimatedEyeIcon } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceSelectedElement } from "./types";

interface CanvasPreviewProps {
  designMode: boolean;
  previewUrl?: string;
  previewStatusText: string;
  previewError: string | null;
  isPreviewStarting: boolean;
  onDesignModeChange: (enabled: boolean) => void;
  onSelectionChange: (selection: WorkspaceSelectedElement) => void;
}

export function CanvasPreview({
  designMode,
  previewUrl,
  previewStatusText,
  previewError,
  isPreviewStarting,
  onDesignModeChange,
  onSelectionChange,
}: CanvasPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const selectIconRef = useRef<CursorClickIconHandle>(null);
  const inspectIconRef = useRef<EyeIconHandle>(null);
  const previewSource = useMemo(() => {
    if (!previewUrl) return undefined;
    return previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    if (!previewUrl) return;
    const allowedOrigin = new URL(previewUrl).origin;
    const onMessage = (event: MessageEvent<{ source?: string; type?: string; payload?: WorkspaceSelectedElement }>) => {
      if (
        event.origin !== allowedOrigin ||
        event.data?.source !== "destoc-preview-bridge" ||
        event.data?.type !== "DESTOC_ELEMENT_SELECTED" ||
        !event.data.payload?.selector
      ) {
        return;
      }
      onSelectionChange(event.data.payload);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onSelectionChange, previewUrl]);

  function sendDesignMode(enabled: boolean) {
    if (!previewUrl) return;
    iframeRef.current?.contentWindow?.postMessage(
      { source: "destoc-workspace", type: "DESTOC_DESIGN_MODE", enabled },
      new URL(previewUrl).origin,
    );
  }

  function setToolMode(mode: "select" | "inspect") {
    const enabled = mode === "select";
    onDesignModeChange(enabled);
    sendDesignMode(enabled);
  }

  return (
    <main className="relative min-w-0 flex-1 overflow-hidden bg-white">
      {previewUrl ? (
        <iframe
          key={previewUrl}
          ref={iframeRef}
          title="Repository preview"
          src={previewSource}
          onLoad={() => sendDesignMode(designMode)}
          className="h-full w-full border-0 bg-white"
        />
      ) : (
        <div className="grid h-full place-items-center bg-[#f8f8f4] p-8 text-center text-zinc-950">
          <div className="max-w-sm">
            <div className="mx-auto mb-4 grid size-10 place-items-center rounded-full bg-zinc-950 text-[#d7ff64]">
              {isPreviewStarting ? <Loader2 className="size-4 animate-spin" /> : <MousePointer2 className="size-4" />}
            </div>
            <h2 className="text-lg font-medium">{previewStatusText}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {isPreviewStarting ? "Destoc is preparing a fresh sandbox automatically. You can keep writing context while it starts." : "The preview will start automatically when this project is available."}
            </p>
            {previewError ? <p role="alert" className="mt-3 text-sm leading-6 text-rose-600">{previewError}</p> : null}
          </div>
        </div>
      )}

      {isPreviewStarting && previewUrl ? (
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-black/10 bg-white/90 px-3 py-1.5 text-xs text-zinc-600 shadow-lg backdrop-blur">
          <Loader2 className="size-3.5 animate-spin" />
          {previewStatusText}
        </div>
      ) : null}

      <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-black/10 bg-[#282826]/95 p-1 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                aria-pressed={designMode}
                onClick={() => setToolMode("select")}
                onMouseEnter={() => selectIconRef.current?.startAnimation()}
                onMouseLeave={() => selectIconRef.current?.stopAnimation()}
                disabled={!previewUrl}
                className={cn("text-zinc-300 hover:bg-white/[0.08] hover:text-white", designMode && "bg-white/[0.08] text-white")}
              >
                <AnimatedCursorClickIcon ref={selectIconRef} size={14} animateOnHover={false} /> Select
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select components in the preview</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                aria-pressed={!designMode}
                onClick={() => setToolMode("inspect")}
                onMouseEnter={() => inspectIconRef.current?.startAnimation()}
                onMouseLeave={() => inspectIconRef.current?.stopAnimation()}
                disabled={!previewUrl}
                className={cn("text-zinc-500 hover:bg-white/[0.08] hover:text-white", !designMode && "bg-white/[0.08] text-white")}
              >
                <AnimatedEyeIcon ref={inspectIconRef} size={14} animateOnHover={false} /> Inspect
              </Button>
            </TooltipTrigger>
            <TooltipContent>Interact with the preview normally</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </main>
  );
}
