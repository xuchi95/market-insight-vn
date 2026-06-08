import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

/* =========================================================
 * Asset detail UI primitives — shared visual shell used by
 * `/tai-san/$symbol` (crypto, gold, oil, bank, fx) and
 * `/co-phieu/$symbol` (Vietnamese stocks).
 *
 * Purely presentational: no data-fetching, no business logic.
 * ========================================================= */

export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card shadow-[0_1px_0_color-mix(in_oklab,white_4%,transparent)_inset,0_18px_40px_-22px_rgba(0,0,0,0.45)] overflow-hidden ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionLabel({
  title,
  sub,
  badge,
  right,
  loading,
}: {
  title: string;
  sub?: string;
  badge?: ReactNode;
  right?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-b border-border flex-wrap">
      <div className="flex items-center gap-2.5 text-sm font-semibold">
        {badge}
        <span>{title}</span>
        {sub && <span className="text-xs font-normal text-muted-foreground">· {sub}</span>}
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--gold)]" />}
      </div>
      {right}
    </div>
  );
}

export function LivePing() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inset-0 rounded-full bg-[var(--up)]" />
      <span className="live-dot-ring" />
    </span>
  );
}

export type KpiCell = { k: string; v: string; tone?: "up" | "down" };
export function KpiStrip({ cells }: { cells: KpiCell[] }) {
  return (
    <section className="rise d2 mt-5 rounded-2xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border">
        {cells.map((c, i) => (
          <div key={i} className="bg-card px-4 py-3.5">
            <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-muted-foreground mb-1.5">{c.k}</div>
            <div
              className={`text-[17px] font-bold tabular tracking-tight ${
                c.tone === "up" ? "text-[var(--up)]" : c.tone === "down" ? "text-[var(--down)]" : ""
              }`}
            >
              {c.v}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StatRow({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-b-0 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span
        className={`font-semibold tabular ${tone === "up" ? "text-[var(--up)]" : tone === "down" ? "text-[var(--down)]" : ""}`}
      >
        {v}
      </span>
    </div>
  );
}

export function ChartError({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="h-8 w-8 text-[var(--down)]" />
      <div className="text-sm font-semibold">Không tải được biểu đồ</div>
      {message && <div className="text-xs text-muted-foreground max-w-xs">{message}. Vui lòng thử lại.</div>}
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/40"
      >
        <RefreshCw className="h-3 w-3" /> Thử lại
      </button>
    </div>
  );
}

export function ChartEmpty() {
  return (
    <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
      Chưa có dữ liệu lịch sử.
    </div>
  );
}

export type HeroProps = {
  eyebrow: string;
  logo: ReactNode;
  title: string;
  pills: string[];
  meta: { k: string; v: string }[];
  price: ReactNode;
  priceSuffix?: string;
  subPrice?: string;
  subPriceTone?: "up" | "down";
  changePct?: number | null;
  extra?: ReactNode;
  actions?: ReactNode;
};
export function AssetHero(p: HeroProps) {
  const pos = (p.changePct ?? 0) >= 0;
  return (
    <section className="rise d1 mt-5 flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-border">
      <div className="flex items-center gap-4 min-w-0">
        <div className="h-12 w-12 rounded-full flex-shrink-0 grid place-items-center overflow-hidden bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)] text-[var(--gold-foreground)] shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--gold)_60%,transparent)]">
          {p.logo}
        </div>
        <div className="min-w-0">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">{p.eyebrow}</div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl md:text-[26px] font-bold tracking-tight">{p.title}</h1>
            {p.pills.map((pill, i) => (
              <span
                key={i}
                className={`text-[11px] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-md border ${
                  i === 0
                    ? "border-border text-muted-foreground"
                    : "border-[color-mix(in_oklab,var(--gold)_35%,transparent)] bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-[var(--gold)]"
                }`}
              >
                {pill}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            {p.meta.map((m) => (
              <span key={m.k}>
                {m.k}: <b className="font-semibold text-foreground/80">{m.v}</b>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5 ml-auto">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[32px] md:text-[34px] font-extrabold tracking-tight tabular leading-none">
              {p.price}
              {p.priceSuffix && <span className="text-lg text-muted-foreground font-semibold ml-1">{p.priceSuffix}</span>}
            </span>
            {typeof p.changePct === "number" && (
              <span
                className={`inline-flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-lg tabular leading-none ${
                  pos
                    ? "bg-[color-mix(in_oklab,var(--up)_12%,transparent)] text-[var(--up)]"
                    : "bg-[color-mix(in_oklab,var(--down)_12%,transparent)] text-[var(--down)]"
                }`}
              >
                {pos ? "▲" : "▼"} {pos ? "+" : ""}{p.changePct.toFixed(2)}%
              </span>
            )}
          </div>
          {p.subPrice && (
            <div
              className={`text-[13px] mt-1 tabular ${
                p.subPriceTone === "up" ? "text-[var(--up)]" : p.subPriceTone === "down" ? "text-[var(--down)]" : "text-muted-foreground"
              }`}
            >
              {p.subPrice}
            </div>
          )}
        </div>
        {p.extra}
        {p.actions && <div className="flex items-center gap-2">{p.actions}</div>}
      </div>
    </section>
  );
}