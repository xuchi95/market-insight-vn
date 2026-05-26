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
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular",
        up && "bg-[color-mix(in_oklab,var(--up)_18%,transparent)] text-[var(--up)]",
        down && "bg-[color-mix(in_oklab,var(--down)_18%,transparent)] text-[var(--down)]",
        !up && !down && "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {fmtPct(value)}
    </span>
  );
}