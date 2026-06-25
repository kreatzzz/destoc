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
        "inline-flex h-8 min-w-8 items-center justify-center text-[#f7ca58]",
        className,
      )}
    >
      <span
        className={cn(
          "select-none font-sans text-[21px] font-semibold leading-none tracking-[-0.12em]",
          markClassName,
        )}
      >
        D.
      </span>
    </span>
  );
}
