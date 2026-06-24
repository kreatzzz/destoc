"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Eye, Maximize2, Minimize2, MousePointer2, RefreshCw, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CanvasPreviewProps {
  designMode: boolean;
  previewUrl?: string;
  onDesignModeChange: (enabled: boolean) => void;
  onSelectionChange: (selection: { selector: string }) => void;
  onStartPreview: () => void;
  isStartingPreview: boolean;
  previewError: string | null;
}

export function CanvasPreview({ designMode, previewUrl, onDesignModeChange, onSelectionChange, onStartPreview, isStartingPreview, previewError }: CanvasPreviewProps) {
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
    const onMessage = (event: MessageEvent<{ source?: string; type?: string; payload?: { selector?: string } }>) => {
      if (event.origin !== allowedOrigin || event.data?.source !== "destoc-preview-bridge" || event.data?.type !== "DESTOC_ELEMENT_SELECTED" || !event.data.payload?.selector) return;
      onSelectionChange({ selector: event.data.payload.selector });
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

  function toggleDesignMode() {
    const enabled = !designMode;
    onDesignModeChange(enabled);
    sendDesignMode(enabled);
  }

  function refreshPreview() {
    if (previewUrl) setReloadKey((current) => current + 1);
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
      // Some embedded browsers reject the native API. A local full-viewport
      // mode preserves the same usable preview experience in that case.
      setIsFullscreenFallback(true);
    }
  }

  return (
    <main ref={previewSurfaceRef} className={cn("relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#181817]", isPreviewExpanded && "fixed inset-0 z-50 h-dvh w-dvw")}>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500"><span className="size-1.5 rounded-full bg-emerald-400" /> localhost:3000</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" aria-label="Restart sandbox preview" onClick={onStartPreview} disabled={!previewUrl || isStartingPreview} className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"><RotateCcw /></Button>
          <Button variant="ghost" size="icon-xs" aria-label="Refresh preview" onClick={refreshPreview} disabled={!previewUrl} className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"><RefreshCw /></Button>
          <Button variant="ghost" size="icon-xs" aria-label={isPreviewExpanded ? "Exit fullscreen preview" : "Expand preview"} onClick={() => void toggleFullscreen()} disabled={!previewUrl} className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100">{isPreviewExpanded ? <Minimize2 /> : <Maximize2 />}</Button>
          <div className="ml-1 h-4 w-px bg-white/[0.08]" />
          <button onClick={toggleDesignMode} className={cn("ml-1 flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors", designMode ? "bg-[#d7ff64] text-[#1b1d17] shadow-[0_0_16px_rgba(215,255,100,0.16)]" : "bg-white/[0.06] text-zinc-400 hover:text-zinc-100")}>
            <Crosshair className="size-3" /> Design mode
          </button>
        </div>
      </div>

      <div className={cn("relative min-h-0 flex-1 overflow-auto", isPreviewExpanded ? "p-0" : "p-5 lg:p-8")}>
        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: "radial-gradient(#6d6c65 0.7px, transparent 0.7px)", backgroundSize: "16px 16px" }} />
        <div className={cn("relative mx-auto w-full overflow-hidden bg-[#f8f8f4]", isPreviewExpanded ? "h-full max-w-none" : "min-h-[590px] max-w-[900px] rounded-xl border border-white/[0.12] shadow-[0_25px_80px_rgba(0,0,0,0.36)]")}>
          {previewUrl ? <iframe key={reloadKey} ref={iframeRef} title="Repository preview" src={previewSource} onLoad={() => sendDesignMode(designMode)} className={cn("w-full border-0 bg-white", isPreviewExpanded ? "h-full" : "h-[590px]")} /> : <div className="grid min-h-[590px] place-items-center bg-zinc-950 p-8 text-center text-zinc-200"><div><h2 className="text-lg font-medium">Preview is not running</h2><p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Start an isolated sandbox for this public repository to inspect its actual interface.</p>{previewError ? <p role="alert" className="mt-3 max-w-sm text-sm text-rose-300">{previewError}</p> : null}<Button className="mt-5" onClick={onStartPreview} disabled={isStartingPreview}>{isStartingPreview ? "Starting preview…" : "Start preview"}</Button></div></div>}
        </div>
      </div>
      <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-white/[0.1] bg-[#282826]/95 p-1 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="text-zinc-300 hover:bg-white/[0.08] hover:text-white"><MousePointer2 /> Select</Button>
          <Button size="sm" variant="ghost" className="text-zinc-500 hover:bg-white/[0.08] hover:text-white"><Eye /> Inspect</Button>
          <div className="mx-1 h-4 w-px bg-white/[0.1]" />
          <Badge variant="outline" className="border-white/[0.1] bg-white/[0.04] text-[10px] text-zinc-400"><Sparkles className="size-2.5 text-[#d7ff64]" /> 3 suggestions</Badge>
        </div>
      </div>
    </main>
  );
}
