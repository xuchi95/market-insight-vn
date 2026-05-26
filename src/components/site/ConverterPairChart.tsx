import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LCIcon, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtNum } from "@/lib/format";

type Range = "1" | "7" | "30";

interface Point { t: number; v: number }

export interface PairChartAsset {
  key: string;
  kind: "crypto" | "forex" | "gold";
  rateVnd: number;
  /** code hiển thị, vd "USD", "BTC", "PNJ" */
  code: string;
}

interface HistoryResp {
  from: string;
  to: string;
  days: number;
  points: Point[];
  source?: string;
  error?: string;
}

async function fetchPairHistory(from: string, to: string, days: Range): Promise<HistoryResp> {
  const u = `/api/public/pair-history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&days=${days}`;
  const r = await fetch(u, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function ConverterPairChart({ from, to }: { from: PairChartAsset | null; to: PairChartAsset | null }) {
  const [range, setRange] = useState<Range>("7");

  const ready = !!(from && to && from.key !== to.key);
  const ratio = ready ? from!.rateVnd / to!.rateVnd : 0;
  const pairKey = ready ? `${from!.key}>${to!.key}` : "";

  const query = useQuery({
    queryKey: ["pair-history", from?.key, to?.key, range],
    queryFn: () => fetchPairHistory(from!.key, to!.key, range),
    enabled: ready,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const data: Point[] = useMemo(() => {
    const pts = query.data?.points ?? [];
    if (!pts.length || !ready) return pts;
    // Đính kèm giá hiện tại vào cuối để khớp với phần "1 X = Y" đang hiển thị bên trên.
    const last = pts[pts.length - 1];
    if (Math.abs(last.v - ratio) / ratio < 0.0005) return pts;
    return [...pts, { t: Date.now(), v: ratio }];
  }, [query.data, ready, ratio]);

  const stats = useMemo(() => {
    if (!data.length) return null;
    const first = data[0].v;
    const last = data[data.length - 1].v;
    let min = data[0].v, max = data[0].v;
    for (const d of data) { if (d.v < min) min = d.v; if (d.v > max) max = d.v; }
    return { first, last, min, max, change: ((last - first) / first) * 100 };
  }, [data]);

  const positive = (stats?.change ?? 0) >= 0;
  const color = positive ? "var(--up)" : "var(--down)";

  const refVal = stats?.last ?? ratio;
  const dp = refVal === 0 ? 4 : refVal >= 1000 ? 0 : refVal >= 1 ? 4 : 8;
  const fmtVal = (v: number) => fmtNum(v, dp);

  if (!ready) {
    return (
      <div className="rounded-xl border bg-card/40 p-4 text-sm text-muted-foreground">
        Chọn hai loại tiền khác nhau để xem biểu đồ biến động.
      </div>
    );
  }

  const rangeLabel = range === "1" ? "24h" : range === "7" ? "7 ngày" : "30 ngày";
  const source = query.data?.source;
  const isLoading = query.isLoading || query.isFetching;
  const hasError = !!query.error || (query.data && !query.data.points?.length);

  return (
    <div className="rounded-xl border bg-card/40">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          <LCIcon className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">Biến động {from!.code}/{to!.code}</div>
            <div className="text-[11px] text-muted-foreground">
              Xu hướng tỷ giá {rangeLabel}
              {source ? <> — Nguồn: {source}</> : null}
            </div>
          </div>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList className="h-8">
            <TabsTrigger value="1" className="text-xs px-2">24h</TabsTrigger>
            <TabsTrigger value="7" className="text-xs px-2">7N</TabsTrigger>
            <TabsTrigger value="30" className="text-xs px-2">30N</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {stats && (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1 px-4 pt-3">
          <div>
            <div className="text-[11px] text-muted-foreground">1 {from!.code} =</div>
            <div className="text-lg font-bold tabular tracking-tight">{fmtVal(stats.last)} <span className="text-xs text-muted-foreground font-semibold">{to!.code}</span></div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Thay đổi {rangeLabel}</div>
            <div className="text-sm font-semibold tabular" style={{ color }}>{positive ? "+" : ""}{stats.change.toFixed(2)}%</div>
          </div>
          <div className="text-[11px] text-muted-foreground tabular">
            <div>Cao: {fmtVal(stats.max)}</div>
            <div>Thấp: {fmtVal(stats.min)}</div>
          </div>
        </div>
      )}
      <div className="h-48 w-full px-2 pb-2 pt-2 relative">
        {isLoading && !data.length && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu lịch sử…
          </div>
        )}
        {!isLoading && hasError && !data.length && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
            Không có dữ liệu lịch sử cho cặp này ở khung {rangeLabel}.
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`pairFill-${pairKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(t) =>
                range === "1"
                  ? new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                  : new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
              }
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              dataKey="v"
              tickFormatter={fmtVal}
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={64}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
              labelFormatter={(t) => new Date(t as number).toLocaleString("vi-VN")}
              formatter={(v: number) => [`${fmtVal(v)} ${to!.code}`, `1 ${from!.code}`]}
            />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#pairFill-${pairKey})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}