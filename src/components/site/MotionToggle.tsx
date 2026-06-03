import { Zap, ZapOff } from "lucide-react";
import { useMotionPref } from "@/hooks/useMotionPref";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Toggle global price flash + tween animations. Useful on low-end devices
 * where the 10s realtime updates would otherwise feel janky.
 */
export function MotionToggle() {
  const { animate, toggle } = useMotionPref();
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggle}
            aria-label={animate ? "Tắt hiệu ứng nhảy giá" : "Bật hiệu ứng nhảy giá"}
            aria-pressed={animate}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-[var(--gold)] hover:bg-accent transition-colors"
          >
            {animate ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {animate ? "Hiệu ứng giá đang bật — bấm để tắt (giảm giật)" : "Hiệu ứng giá đang tắt — bấm để bật"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}