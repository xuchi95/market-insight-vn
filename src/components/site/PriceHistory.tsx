import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeBadge } from "./ChangeBadge";
import { fmtNum } from "@/lib/format";

type Point = { t: number; v: number };

/** Query /api/public/pair-history for {assetKey}/VND (or USD when useUsd). */
async function loadSeries(assetKey: string, days: number, useUsd: boolean): Promise<Point[]> {
  // For USD-denominated charts we still call pair-history with to=f:USD which returns the asset/USD ratio.
  // For VND charts to=vnd returns the asset value in VND directly.
  const to = useUsd ? "f:usd" : "vnd";
  const url = `/api/public/pair-history?from=${encodeURIComponent(assetKey)}&to=${encodeURIComponent(to)}&days=${days}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    if (Array.isArray(j?.points)) return j.points as Point[];
  } catch {}
  return [];
}

function computeChange(points: Point[], windowMs: number): number | null {
  if (!points.length) return null;
  const last = points[points.length - 1];
  const target = last.t - windowMs;
  // find the earliest point >= target
  let base: Point | null = null;
  for (const p of points) {
    if (p.t >= target) { base = p; break; }
  }
  if (!base) base = points[0];
  if (!base.v) return null;
  return ((last.v - base.v) / base.v) * 100;
}

export interface PriceHistoryProps {
  /** pair-history key, e.g. "g:sjc-1l", "f:usd", "c:bitcoin" */
  assetKey: string;
  /** Display label like "SJC 1L (VND/chỉ)" */
  title?: string;
  /** Show USD axis instead of VND (for crypto). */
  useUsd?: boolean;
  /** Decimal places in tooltip / axis. */
  decimals?: number;
}

export function PriceHistory({ assetKey, title = "Biểu đồ giá", useUsd = false, decimals = 0 }: PriceHistoryProps) {
  const [range, setRange] = useState<"1" | "7" | "30">("7");

  const { data: chart, isLoading } = useQuery({
    queryKey: ["pair-history", assetKey, range, useUsd],
    queryFn: () => loadSeries(assetKey, Number(range), useUsd),
    refetchInterval: 5 * 60_000,
    enabled: !!assetKey,
  });

  const stats = useMemo(() => {
    const src = chart ?? [];
    if (!src.length) return null;
    const vals = src.map((p) => p.v);
    const last = src[src.length - 1].v;
    const first = src[0].v;
    const chRange = first ? ((last - first) / first) * 100 : null;
    return {
      last,
      min: Math.min(...vals),
      max: Math.max(...vals),
      chRange,
      ch24: computeChange(src, 24 * 3600_000),
    };
  }, [chart]);

  const rangeLabel = range === "1" ? "24 giờ" : range === "7" ? "7 ngày" : "30 ngày";
  const positive = (stats?.ch24 ?? stats?.chRange ?? 0) >= 0;
  const color = positive ? "var(--up)" : "var(--down)";

  const fmt = (v: number) => (useUsd ? "$" + fmtNum(v, decimals) : fmtNum(v, decimals));

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
        <h2 className="font-bold">{title}</h2>
        <Tabs value={range} onValueChange={(v) => setRange(v as "1" | "7" | "30")} className="ml-auto">
          <TabsList className="h-9">
            <TabsTrigger value="1">24h</TabsTrigger>
            <TabsTrigger value="7">7 ngày</TabsTrigger>
            <TabsTrigger value="30">30 ngày</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 border-b border-border text-sm">
          <StatPill label="Giá hiện tại" value={fmt(stats.last)} />
          <StatPill label="Thay đổi 24h" pct={stats.ch24} />
          <StatPill label={`Cao nhất (${rangeLabel})`} value={fmt(stats.max)} />
          <StatPill label={`Thấp nhất (${rangeLabel})`} value={fmt(stats.min)} />
          <StatPill label="Khung thời gian" value={rangeLabel} />
        </div>
      )}

      <div className="h-80 w-full p-4">
        {isLoading ? <Skeleton className="h-full w-full" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart ?? []}>
              <defs>
                <linearGradient id={`ph-${assetKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickFormatter={(t) =>
                  range === "1"
                    ? new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                    : new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
                }
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis
                dataKey="v"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={80}
                domain={["auto", "auto"]}
                tickFormatter={(v) => new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 2 }).format(v as number)}
              />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                labelFormatter={(t) => new Date(t as number).toLocaleString("vi-VN")}
                formatter={(v: number) => [fmt(v), "Giá"]}
              />
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#ph-${assetKey})`} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {!isLoading && (!chart || chart.length === 0) && (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground -mt-80">
            Chưa có dữ liệu lịch sử cho khung thời gian này.
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value, pct }: { label: string; value?: string; pct?: number | null }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular mt-1">
        {value ?? (pct == null ? "—" : <ChangeBadge value={pct} />)}
      </div>
    </div>
  );
}