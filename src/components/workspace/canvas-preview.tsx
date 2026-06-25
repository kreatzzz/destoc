"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Eye, Maximize2, Minimize2, MousePointer2, RefreshCw, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceSelectedElement } from "./types";

interface CanvasPreviewProps {
  designMode: boolean;
  previewUrl?: string;
  onDesignModeChange: (enabled: boolean) => void;
  onSelectionChange: (selection: WorkspaceSelectedElement) => void;
  onStartPreview: () => void;
  onRefreshPreview: () => Promise<boolean>;
  isStartingPreview: boolean;
  isRefreshingPreview: boolean;
  previewError: string | null;
  suggestionCount: number;
}

function PreviewTooltipButton({
  label,
  children,
  disabled,
  onClick,
  pressed,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  pressed?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100",
            pressed && "bg-white/[0.08] text-zinc-100",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function CanvasPreview({
  designMode,
  previewUrl,
  onDesignModeChange,
  onSelectionChange,
  onStartPreview,
  onRefreshPreview,
  isStartingPreview,
  isRefreshingPreview,
  previewError,
  suggestionCount,
}: CanvasPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewSurfaceRef = useRef<HTMLElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenFallback, setIsFullscreenFallback] = useState(false);
  const isPreviewExpanded = isFullscreen || isFullscreenFallback;
  const previewSource = useMemo(() => {
    if (!previewUrl) return undefined;
    const url = new URL(previewUrl);
    url.searchParams.set("destocReload", String(reloadKey));
    return url.toString();
  }, [previewUrl, reloadKey]);

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

  useEffect(() => {
    const onFullscreenChange = () => {
      const isNativeFullscreen = document.fullscreenElement === previewSurfaceRef.current;
      setIsFullscreen(isNativeFullscreen);
      if (isNativeFullscreen) setIsFullscreenFallback(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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

  async function refreshPreview() {
    if (!previewUrl || isRefreshingPreview || isStartingPreview) return;
    const shouldReload = await onRefreshPreview();
    if (shouldReload) setReloadKey((current) => current + 1);
  }

  async function toggleFullscreen() {
    const surface = previewSurfaceRef.current;
    if (!surface) return;
    if (isPreviewExpanded) {
      setIsFullscreenFallback(false);
      if (document.fullscreenElement === surface) {
        await document.exitFullscreen().catch(() => undefined);
      }
      return;
    }

    try {
      await surface.requestFullscreen();
    } catch {
      setIsFullscreenFallback(true);
    }
  }

  return (
    <main ref={previewSurfaceRef} className={cn("relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#181817]", isPreviewExpanded && "fixed inset-0 z-50 h-dvh w-dvw")}>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className={cn("size-1.5 rounded-full", previewUrl ? "bg-emerald-400" : "bg-zinc-600")} />
          {previewUrl ? "sandbox preview" : "preview stopped"}
        </div>
        <div className="flex items-center gap-1">
          <PreviewTooltipButton label="Start a new sandbox preview" onClick={onStartPreview} disabled={isStartingPreview}>
            <RotateCcw className={cn(isStartingPreview && "animate-spin")} />
          </PreviewTooltipButton>
          <PreviewTooltipButton label="Reload preview" onClick={() => void refreshPreview()} disabled={!previewUrl || isRefreshingPreview || isStartingPreview}>
            <RefreshCw className={cn(isRefreshingPreview && "animate-spin")} />
          </PreviewTooltipButton>
          <PreviewTooltipButton label={isPreviewExpanded ? "Exit fullscreen preview" : "Expand preview"} onClick={() => void toggleFullscreen()} disabled={!previewUrl}>
            {isPreviewExpanded ? <Minimize2 /> : <Maximize2 />}
          </PreviewTooltipButton>
          <div className="ml-1 h-4 w-px bg-white/[0.08]" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setToolMode(designMode ? "inspect" : "select")}
                className={cn(
                  "ml-1 flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors",
                  designMode ? "bg-[#d7ff64] text-[#1b1d17] shadow-[0_0_16px_rgba(215,255,100,0.16)]" : "bg-white/[0.06] text-zinc-400 hover:text-zinc-100",
                )}
              >
                <Crosshair className="size-3" /> Design mode
              </button>
            </TooltipTrigger>
            <TooltipContent>{designMode ? "Turn off element selection" : "Turn on element selection"}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className={cn("relative min-h-0 flex-1 overflow-auto", isPreviewExpanded ? "p-0" : "p-5 lg:p-8")}>
        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: "radial-gradient(#6d6c65 0.7px, transparent 0.7px)", backgroundSize: "16px 16px" }} />
        <div className={cn("relative mx-auto w-full overflow-hidden bg-[#f8f8f4]", isPreviewExpanded ? "h-full max-w-none" : "min-h-[590px] max-w-[900px] rounded-xl border border-white/[0.12] shadow-[0_25px_80px_rgba(0,0,0,0.36)]")}>
          {previewUrl ? (
            <iframe
              key={reloadKey}
              ref={iframeRef}
              title="Repository preview"
              src={previewSource}
              onLoad={() => sendDesignMode(designMode)}
              className={cn("w-full border-0 bg-white", isPreviewExpanded ? "h-full" : "h-[590px]")}
            />
          ) : (
            <div className="grid min-h-[590px] place-items-center bg-zinc-950 p-8 text-center text-zinc-200">
              <div>
                <h2 className="text-lg font-medium">Preview is not running</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Start an isolated sandbox for this public repository to inspect its actual interface.</p>
                {previewError ? <p role="alert" className="mt-3 max-w-sm text-sm text-rose-300">{previewError}</p> : null}
                <Button className="mt-5" onClick={onStartPreview} disabled={isStartingPreview}>
                  {isStartingPreview ? "Starting preview…" : "Start preview"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-white/[0.1] bg-[#282826]/95 p-1 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" aria-pressed={designMode} onClick={() => setToolMode("select")} className={cn("text-zinc-300 hover:bg-white/[0.08] hover:text-white", designMode && "bg-white/[0.08] text-white")}>
                <MousePointer2 /> Select
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select elements in the preview</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" aria-pressed={!designMode} onClick={() => setToolMode("inspect")} className={cn("text-zinc-500 hover:bg-white/[0.08] hover:text-white", !designMode && "bg-white/[0.08] text-white")}>
                <Eye /> Inspect
              </Button>
            </TooltipTrigger>
            <TooltipContent>Interact with the preview normally</TooltipContent>
          </Tooltip>
          <div className="mx-1 h-4 w-px bg-white/[0.1]" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="border-white/[0.1] bg-white/[0.04] text-[10px] text-zinc-400">
                <Sparkles className="size-2.5 text-[#d7ff64]" /> {suggestionCount} suggestions
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Suggestions from the latest audit</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </main>
  );
}
