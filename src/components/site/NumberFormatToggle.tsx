import { useNumberFormat } from "@/hooks/useNumberFormat";

/**
 * Tiny pill button that toggles compact vs full number formatting.
 * Affects every component reading the `useNumberFormat()` context.
 */
export function NumberFormatToggle() {
  const { compact, toggle } = useNumberFormat();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={compact}
      className="inline-flex h-8 items-center justify-center rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-[var(--gold)] hover:bg-accent transition-colors tabular"
    >
      {compact ? "1,2M" : "1.234.567"}
    </button>
  );
}