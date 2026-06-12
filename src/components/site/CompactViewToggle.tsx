import { Maximize2, Minimize2 } from "lucide-react";
import { useCompactView } from "@/hooks/useCompactView";

/**
 * Mobile-only toggle that switches a table between compact (few columns)
 * and expanded (all columns) views. Preference is persisted globally.
 */
export function CompactViewToggle({ className = "" }: { className?: string }) {
  const { compact, toggle } = useCompactView();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!compact}
      title={compact ? "Mở rộng bảng" : "Thu gọn bảng"}
      className={
        "md:hidden inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 h-7 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors " +
        className
      }
    >
      {compact ? (
        <>
          <Maximize2 className="h-3 w-3" />
          <span>Đầy đủ</span>
        </>
      ) : (
        <>
          <Minimize2 className="h-3 w-3" />
          <span>Gọn</span>
        </>
      )}
    </button>
  );
}