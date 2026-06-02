import { useNumberFormat } from "@/hooks/useNumberFormat";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Tiny pill button that toggles compact vs full number formatting.
 * Affects every component reading the `useNumberFormat()` context.
 */
export function NumberFormatToggle() {
  const { compact, toggle } = useNumberFormat();
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggle}
            aria-label={compact ? "Hiển thị số đầy đủ" : "Hiển thị rút gọn"}
            aria-pressed={compact}
            className="inline-flex h-8 items-center justify-center rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-[var(--gold)] hover:bg-accent transition-colors tabular"
          >
            {compact ? "1,2M" : "1.234.567"}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {compact ? "Đang hiển thị rút gọn — bấm để hiển thị đầy đủ" : "Đang hiển thị đầy đủ — bấm để rút gọn"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}