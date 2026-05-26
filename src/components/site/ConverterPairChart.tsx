import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LCIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtNum } from "@/lib/format";

type Range = "1" | "7" | "30";

interface Point { t: number; v: number }

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSeries(ratio: number, range: Range, pairKey: string, volatility: number): Point[] {
  const days = Number(range);
  const n = days === 1 ? 48 : days === 7 ? 84 : 60; // 30N hơi thưa
  const now = Date.now();
  const step = (days * 24 * 3600 * 1000) / n;
  const rng = mulberry32(hashStr(pairKey + ":" + range));
  const out: Point[] = [];
  // Bắt đầu lệch nhẹ so với giá hiện tại để giá hiện tại đứng ở cuối chuỗi.
  let v = ratio * (1 + (rng() - 0.5) * volatility * 4);
  // Kéo chuỗi về đúng ratio ở điểm cuối bằng cách trộn drift về target.
  for (let i = 0; i < n; i++) {
    const noise = (rng() - 0.5) * volatility;
    const pull = ((ratio - v) / Math.max(1, n - i)) * 0.6;
    v = v * (1 + noise) + pull;
    out.push({ t: now - (n - 1 - i) * step, v });
  }
  // Đảm bảo điểm cuối khớp giá hiện tại.
  out[out.length - 1] = { t: now, v: ratio };
  return out;
}

function volatilityFor(kind: string): number {
  // biên độ noise mỗi bước
  if (kind === "crypto") return 0.012;
  if (kind === "gold") return 0.004;
  return 0.002; // forex
}

export interface PairChartAsset {
  key: string;
  kind: "crypto" | "forex" | "gold";
  rateVnd: number;
  /** code hiển thị, vd "USD", "BTC", "PNJ" */
  code: string;
}

export function ConverterPairChart({ from, to }: { from: PairChartAsset | null; to: PairChartAsset | null }) {
  const [range, setRange] = useState<Range>("7");

  const ready = !!(from && to && from.rateVnd > 0 && to.rateVnd > 0 && from.key !== to.key);
  const ratio = ready ? from!.rateVnd / to!.rateVnd : 0;
  const pairKey = ready ? `${from!.key}>${to!.key}` : "";
  const vol = ready ? Math.max(volatilityFor(from!.kind), volatilityFor(to!.kind)) : 0;

  const data = useMemo(() => (ready ? buildSeries(ratio, range, pairKey, vol) : []), [ready, ratio, range, pairKey, vol]);

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

  const dp = ratio === 0 ? 4 : ratio >= 1000 ? 0 : ratio >= 1 ? 4 : 8;
  const fmtVal = (v: number) => fmtNum(v, dp);

  if (!ready) {
    return (
      <div className="rounded-xl border bg-card/40 p-4 text-sm text-muted-foreground">
        Chọn hai loại tiền khác nhau để xem biểu đồ biến động.
      </div>
    );
  }

  const rangeLabel = range === "1" ? "24h" : range === "7" ? "7 ngày" : "30 ngày";

  return (
    <div className="rounded-xl border bg-card/40">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          <LCIcon className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">Biến động {from!.code}/{to!.code}</div>
            <div className="text-[11px] text-muted-foreground">Xu hướng tỷ giá {rangeLabel} (mô phỏng quanh giá hiện tại)</div>
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
      <div className="h-48 w-full px-2 pb-2 pt-2">
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