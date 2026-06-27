import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Activity } from "lucide-react";

type Kpi = { value: number; changePct: number | null } | null;
type Overview = {
  vnIndex: Kpi;
  usdVnd: Kpi;
  btcDominance: Kpi;
  fearGreed: ({ value: number; changePct: number | null; label?: string }) | null;
  sparkline: number[] | null;
  fetchedAt: number;
};

const FNG_LABEL_VI: Record<string, string> = {
  "Extreme Fear": "Sợ hãi tột độ",
  Fear: "Sợ hãi",
  Neutral: "Trung tính",
  Greed: "Tham lam",
  "Extreme Greed": "Tham lam tột độ",
};

async function fetchOverview(): Promise<Overview> {
  const res = await fetch("/api/public/market-overview", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function fmtNum(n: number, d = 2) {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: d, minimumFractionDigits: d });
}

function ChartArea({ data }: { data: number[] | null | undefined }) {
  if (!data || data.length < 2) {
    return (
      <div className="relative h-[150px] w-full overflow-hidden rounded-lg bg-[color-mix(in_oklab,var(--gold)_4%,transparent)]" aria-hidden>
        <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground/60">Đang tải biểu đồ…</div>
      </div>
    );
  }
  const w = 600;
  const h = 150;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 12) - 6]) as Array<[number, number]>;
  const linePts = pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  const areaD =
    `M ${pts[0][0].toFixed(2)},${h} ` +
    pts.map((p) => `L ${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ") +
    ` L ${pts[pts.length - 1][0].toFixed(2)},${h} Z`;
  const up = data[data.length - 1] >= data[0];
  const stroke = up ? "var(--up)" : "var(--down)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[150px] w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="mo-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Soft grid lines */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1={0} x2={w} y1={h * p} y2={h * p} stroke="currentColor" strokeOpacity="0.06" />
      ))}
      <path d={areaD} fill="url(#mo-fill)" />
      <polyline
        points={linePts}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Stat({
  label,
  value,
  change,
  sub,
}: {
  label: string;
  value: string;
  change: number | null;
  sub?: string;
}) {
  const has = typeof change === "number";
  const up = (change ?? 0) >= 0;
  return (
    <div className="min-w-0">
      <div className="text-[10px] md:text-[11px] uppercase tracking-[0.16em] text-muted-foreground/80">{label}</div>
      <div className="mt-1 tabular-nums text-[15px] md:text-base leading-tight font-semibold text-foreground truncate">{value}</div>
      {has ? (
        <div className={`mt-0.5 text-[11px] tabular-nums ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
          {up ? "+" : ""}
          {fmtNum(change!, 2)}%
        </div>
      ) : sub ? (
        <div className="mt-0.5 text-[11px] text-muted-foreground/80 truncate">{sub}</div>
      ) : (
        <div className="mt-0.5 text-[11px] text-muted-foreground/60">—</div>
      )}
    </div>
  );
}

export function MarketSummaryCard() {
  const { data } = useQuery({
    queryKey: ["market-overview"],
    queryFn: fetchOverview,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const updated = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div
      className="relative rounded-2xl border border-[color-mix(in_oklab,var(--gold)_20%,var(--border))] bg-card p-5 md:p-6 shadow-[0_1px_0_color-mix(in_oklab,white_4%,transparent)_inset,0_18px_40px_-22px_rgba(0,0,0,0.45)]"
      style={{
        backgroundImage:
          "radial-gradient(380px 200px at 92% 0%, color-mix(in oklab, var(--gold) 10%, transparent), transparent 70%)",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3 md:mb-4">
        <div className="inline-flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-[var(--gold)] shrink-0" aria-hidden />
          <span className="text-sm font-semibold text-foreground truncate">Tổng quan thị trường</span>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          24h
        </span>
      </div>

      <ChartArea data={data?.sparkline} />

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-3 border-t border-border/60 pt-4">
        <Stat
          label="VN-Index"
          value={data?.vnIndex ? fmtNum(data.vnIndex.value, 2) : "—"}
          change={data?.vnIndex?.changePct ?? null}
        />
        <Stat
          label="USD/VND"
          value={data?.usdVnd ? data.usdVnd.value.toLocaleString("vi-VN", { maximumFractionDigits: 0 }) : "—"}
          change={data?.usdVnd?.changePct ?? null}
        />
        <Stat
          label="BTC.D"
          value={data?.btcDominance ? `${fmtNum(data.btcDominance.value, 2)}%` : "—"}
          change={data?.btcDominance?.changePct ?? null}
        />
        <Stat
          label="Fear & Greed"
          value={data?.fearGreed ? String(data.fearGreed.value) : "—"}
          change={data?.fearGreed?.changePct ?? null}
          sub={data?.fearGreed?.label ? FNG_LABEL_VI[data.fearGreed.label] ?? data.fearGreed.label : undefined}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] md:text-xs text-muted-foreground">
        <span className="truncate">Dữ liệu cập nhật lúc {updated}</span>
        <Link
          to="/chung-khoan"
          className="inline-flex items-center gap-1 text-[var(--gold)] hover:text-[var(--gold-light)] font-medium"
        >
          Xem chi tiết <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}