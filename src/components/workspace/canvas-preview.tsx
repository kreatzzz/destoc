import { Crosshair, Eye, Maximize2, MousePointer2, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CanvasPreviewProps {
  designMode: boolean;
  onDesignModeChange: (enabled: boolean) => void;
}

export function CanvasPreview({ designMode, onDesignModeChange }: CanvasPreviewProps) {
  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#181817]">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500"><span className="size-1.5 rounded-full bg-emerald-400" /> localhost:3000</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" aria-label="Refresh preview" className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"><RefreshCw /></Button>
          <Button variant="ghost" size="icon-xs" aria-label="Expand preview" className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"><Maximize2 /></Button>
          <div className="ml-1 h-4 w-px bg-white/[0.08]" />
          <button onClick={() => onDesignModeChange(!designMode)} className={cn("ml-1 flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors", designMode ? "bg-[#d7ff64] text-[#1b1d17] shadow-[0_0_16px_rgba(215,255,100,0.16)]" : "bg-white/[0.06] text-zinc-400 hover:text-zinc-100")}>
            <Crosshair className="size-3" /> Design mode
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto p-5 lg:p-8">
        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: "radial-gradient(#6d6c65 0.7px, transparent 0.7px)", backgroundSize: "16px 16px" }} />
        <div className="relative mx-auto min-h-[590px] w-full max-w-[900px] overflow-hidden rounded-xl border border-white/[0.12] bg-[#f8f8f4] shadow-[0_25px_80px_rgba(0,0,0,0.36)]">
          <div className="flex h-10 items-center justify-between border-b border-black/[0.08] bg-white px-4 text-[10px] text-zinc-500">
            <span className="font-semibold tracking-[-0.02em] text-zinc-900">axis / objects</span>
            <div className="flex items-center gap-4"><span>About</span><span>Objects</span><span>Journal</span><span className="rounded-full bg-zinc-900 px-2.5 py-1 text-white">Visit gallery</span></div>
          </div>
          <section className="relative overflow-hidden px-8 pb-16 pt-18 sm:px-14 sm:pt-24">
            <div className="absolute -right-16 -top-16 size-72 rounded-full bg-[#d8ff62] blur-3xl opacity-80" />
            <div className="absolute bottom-0 left-[10%] h-px w-[75%] bg-zinc-950/10" />
            <p className="relative mb-5 text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">The material library</p>
            <h1 className="relative max-w-xl text-4xl font-semibold tracking-[-0.065em] text-zinc-950 sm:text-6xl">Objects with a longer life.</h1>
            <p className="relative mt-5 max-w-sm text-sm leading-6 text-zinc-600">A deliberate collection of pieces made to be held onto, repaired, and passed forward.</p>
            <button className="relative mt-8 rounded-full bg-zinc-950 px-4 py-2 text-xs font-medium text-white">Explore collection <span className="ml-2">↗</span></button>
            {designMode && <SelectionOverlay />}
          </section>
          <div className="grid grid-cols-3 gap-3 bg-white p-3">
            {["Walnut cup", "Brass study", "Fold lamp"].map((item, index) => <div key={item} className="group relative aspect-[0.86] overflow-hidden bg-[#e8e5df]">
              <div className={cn("absolute inset-x-0 bottom-0 h-2/3", index === 0 ? "bg-[linear-gradient(145deg,#5e321b,#d09b5c)]" : index === 1 ? "bg-[linear-gradient(145deg,#b58044,#f0cd7c)]" : "bg-[linear-gradient(145deg,#a29f91,#d4d1c4)]")} />
              <span className="absolute bottom-3 left-3 text-xs font-medium text-white drop-shadow">{item}</span>
            </div>)}
          </div>
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

function SelectionOverlay() {
  return <div className="pointer-events-none absolute left-[11%] top-[26%] z-10 h-[156px] w-[55%] border-2 border-[#9bd9ff] bg-[#98d8ff]/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_0_20px_rgba(82,190,255,0.28)]">
    <span className="absolute -top-7 left-0 rounded-t-md bg-[#1e98d6] px-2 py-1 text-[10px] font-semibold text-white">hero / heading</span>
    {[["-left-1","-top-1"],["-right-1","-top-1"],["-bottom-1","-left-1"],["-right-1","-bottom-1"]].map(([x,y]) => <i key={`${x}${y}`} className={cn("absolute size-2 rounded-sm border border-white bg-[#1e98d6]", x, y)} />)}
  </div>;
}
