import { cn } from "@/lib/utils";

interface DestocLogoProps {
  className?: string;
  markClassName?: string;
}

export function DestocLogo({ className, markClassName }: DestocLogoProps) {
  return (
    <span
      aria-label="Destoc"
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-[0.6rem] bg-[linear-gradient(135deg,#f7ca58_0%,#d79424_100%)] px-1.5 text-[#1b1205] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_10px_28px_rgba(247,202,88,0.16)]",
        className,
      )}
    >
      <span
        className={cn(
          "select-none font-serif text-[21px] font-black italic leading-none tracking-[-0.16em]",
          markClassName,
        )}
      >
        D.
      </span>
    </span>
  );
}
