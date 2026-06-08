import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ChangeBadge({ value, className }: { value: number; className?: string }) {
  const up = value > 0.0001;
  const down = value < -0.0001;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10.5px] sm:text-xs font-semibold tabular whitespace-nowrap leading-none max-w-full",
        up && "bg-[color-mix(in_oklab,var(--up)_18%,transparent)] text-[var(--up)]",
        down && "bg-[color-mix(in_oklab,var(--down)_18%,transparent)] text-[var(--down)]",
        !up && !down && "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
      {fmtPct(value)}
    </span>
  );
}