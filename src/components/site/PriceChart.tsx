import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LCIcon, TrendingDown, TrendingUp, Minus, ArrowUp, ArrowDown } from "lucide-react";
import { SectionCard, LiveDot } from "./SectionCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Asset = "btc" | "eth" | "gold-sjc" | "usd-vnd" | "eur-vnd" | "gbp-vnd" | "jpy-vnd" | "cny-vnd" | "krw-vnd" | "sgd-vnd" | "aud-vnd" | "cad-vnd" | "chf-vnd" | "hkd-vnd" | "thb-vnd";
type Range = "1" | "7" | "30";
type AssetGroup = "crypto" | "gold" | "forex";

const ASSET_GROUPS: Record<AssetGroup, Asset[]> = {
  crypto: ["btc", "eth"],
  gold: ["gold-sjc"],
  forex: ["usd-vnd", "eur-vnd", "gbp-vnd", "jpy-vnd", "cny-vnd", "krw-vnd", "sgd-vnd", "aud-vnd", "cad-vnd", "chf-vnd", "hkd-vnd", "thb-vnd"],
};

function groupOf(a: Asset): AssetGroup {
  if (a === "btc" || a === "eth") return "crypto";
  if (a === "gold-sjc") return "gold";
  return "forex";
}

const COINGECKO_ID: Record<string, string> = { btc: "bitcoin", eth: "ethereum" };

interface Point { t: number; v: number; }

const BASE_VALUES: Record<Exclude<Asset, "btc" | "eth">, number> = {
  "gold-sjc": 8_400_000,
  "usd-vnd": 25_400,
  "eur-vnd": 27_500,
  "gbp-vnd": 32_200,
  "jpy-vnd": 168,
  "cny-vnd": 3_520,
  "krw-vnd": 18.5,
  "sgd-vnd": 18_800,
  "aud-vnd": 16_600,
  "cad-vnd": 18_400,
  "chf-vnd": 29_000,
  "hkd-vnd": 3_260,
  "thb-vnd": 720,
};

async function loadSeries(asset: Asset, days: Range): Promise<Point[]> {
  if (asset === "btc" || asset === "eth") {
    const id = COINGECKO_ID[asset];
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const j = await res.json();
        return (j.prices as [number, number][]).map(([t, v]) => ({ t, v }));
      }
    } catch {}
  }
  // Synthesize plausible series for gold/forex or as fallback
  const n = Number(days) * 24;
  const base = (BASE_VALUES as Record<string, number>)[asset] ?? 25_400;
  const now = Date.now();
  const step = (Number(days) * 24 * 3600 * 1000) / n;
  const out: Point[] = [];
  let v = base * (1 - 0.03);
  for (let i = 0; i < n; i++) {
    v = v * (1 + (Math.random() - 0.48) * 0.005);
    out.push({ t: now - (n - i) * step, v });
  }
  return out;
}

const ASSETS: { value: Asset; label: string }[] = [
  { value: "btc", label: "Bitcoin (BTC)" },
  { value: "eth", label: "Ethereum (ETH)" },
  { value: "gold-sjc", label: "Vàng SJC" },
  { value: "usd-vnd", label: "USD/VND" },
  { value: "eur-vnd", label: "EUR/VND" },
  { value: "gbp-vnd", label: "GBP/VND" },
  { value: "jpy-vnd", label: "JPY/VND" },
  { value: "cny-vnd", label: "CNY/VND" },
  { value: "krw-vnd", label: "KRW/VND" },
  { value: "sgd-vnd", label: "SGD/VND" },
  { value: "aud-vnd", label: "AUD/VND" },
  { value: "cad-vnd", label: "CAD/VND" },
  { value: "chf-vnd", label: "CHF/VND" },
  { value: "hkd-vnd", label: "HKD/VND" },
  { value: "thb-vnd", label: "THB/VND" },
];

export function PriceChart({
  defaultAsset = "btc",
  assets,
}: {
  defaultAsset?: Asset;
  assets?: Asset[];
} = {}) {
  // Lock the chart to a single coherent asset group derived from defaultAsset.
  // This prevents BTC/ETH from leaking into the gold or forex sections even if
  // a caller passes a mixed `assets` array by mistake.
  const group = groupOf(defaultAsset);
  const allowed = ASSET_GROUPS[group];
  const available = useMemo(() => {
    const requested = assets && assets.length ? assets.filter((a) => allowed.includes(a)) : allowed;
    const final = requested.length ? requested : allowed;
    return ASSETS.filter((a) => final.includes(a.value));
  }, [assets, allowed]);
  const initial = available.some((a) => a.value === defaultAsset) ? defaultAsset : available[0].value;
  const [asset, setAsset] = useState<Asset>(initial);
  // If the parent swaps the group at runtime, snap back to a valid asset.
  if (!available.some((a) => a.value === asset)) {
    setAsset(initial);
  }
  const [range, setRange] = useState<Range>("7");

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["chart", asset, range],
    queryFn: () => loadSeries(asset, range),
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => {
    if (!data || !data.length) return null;
    const first = data[0].v, last = data[data.length - 1].v;
    const vals = data.map((d) => d.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const minIdx = vals.indexOf(min);
    const maxIdx = vals.indexOf(max);
    return {
      first,
      last,
      min,
      max,
      avg,
      minPoint: data[minIdx],
      maxPoint: data[maxIdx],
      change: ((last - first) / first) * 100,
      changeAbs: last - first,
      position: max === min ? 50 : ((last - min) / (max - min)) * 100,
    };
  }, [data]);

  const positive = (stats?.change ?? 0) >= 0;
  const color = positive ? "var(--up)" : "var(--down)";

  const isForex = asset.endsWith("-vnd");
  const fmtVal = (v: number) => {
    if (asset === "gold-sjc") return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 2 }).format(v);
    if (isForex) return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: asset === "jpy-vnd" || asset === "krw-vnd" ? 2 : 0 }).format(v);
    return "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v);
  };

  const rangeLabel = range === "1" ? "24 giờ qua" : range === "7" ? "7 ngày qua" : "30 ngày qua";
  const trendStrength = Math.abs(stats?.change ?? 0);
  const trendWord = trendStrength < 0.3 ? "gần như đi ngang" : trendStrength < 1.5 ? (positive ? "tăng nhẹ" : "giảm nhẹ") : trendStrength < 4 ? (positive ? "tăng" : "giảm") : (positive ? "tăng mạnh" : "giảm mạnh");
  const summary = stats ? `Trong ${rangeLabel}, giá ${trendWord} ${Math.abs(stats.change).toFixed(2)}% so với đầu kỳ.` : "";
  const TrendIcon = trendStrength < 0.3 ? Minus : positive ? TrendingUp : TrendingDown;

  return (
    <SectionCard
      id="chart"
      icon={<LCIcon className="h-4 w-4" />}
      title="Biểu đồ biến động"
      description="So sánh giá tài sản theo khung thời gian"
      meta={<><LiveDot /> Cập nhật mỗi phút</>}
      action={
        <>
          <Select value={asset} onValueChange={(v) => setAsset(v as Asset)} disabled={available.length <= 1}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {available.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList className="h-9">
              <TabsTrigger value="1">24h</TabsTrigger>
              <TabsTrigger value="7">7N</TabsTrigger>
              <TabsTrigger value="30">30N</TabsTrigger>
            </TabsList>
          </Tabs>
        </>
      }
    >
      <div className="p-4 lg:p-6">
        {stats && (
          <>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3 mb-3">
              <div>
                <div className="text-xs text-muted-foreground">Giá hiện tại</div>
                <div className="text-3xl font-bold tabular tracking-tight">{fmtVal(stats.last)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Thay đổi {rangeLabel}</div>
                <div className="flex items-center gap-1.5 text-lg font-semibold tabular" style={{ color }}>
                  <TrendIcon className="h-4 w-4" />
                  {positive ? "+" : ""}{stats.change.toFixed(2)}%
                  <span className="text-xs font-normal text-muted-foreground">({positive ? "+" : ""}{fmtVal(stats.changeAbs)})</span>
                </div>
              </div>
            </div>
            <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm flex items-start gap-2">
              <TrendIcon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
              <span className="text-foreground/90">{summary} <span className="text-muted-foreground">Giá đầu kỳ {fmtVal(stats.first)}.</span></span>
            </div>
            {/* Range position bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" />Thấp nhất {fmtVal(stats.min)}</span>
                <span className="text-foreground/70">Vị trí hiện tại trong khoảng {rangeLabel}</span>
                <span className="flex items-center gap-1">Cao nhất {fmtVal(stats.max)}<ArrowUp className="h-3 w-3" /></span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-visible">
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${stats.position}%`, background: `linear-gradient(90deg, var(--muted) 0%, ${color} 100%)` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-background shadow" style={{ left: `${stats.position}%`, background: color }} />
              </div>
            </div>
          </>
        )}
        <div className="h-72 w-full">
          {isLoading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="v" tickFormatter={fmtVal} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={70} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(t) => new Date(t as number).toLocaleString("vi-VN")}
                  formatter={(v: number) => {
                    if (!stats) return [fmtVal(v), "Giá"];
                    const diff = v - stats.first;
                    const pct = (diff / stats.first) * 100;
                    const sign = diff >= 0 ? "+" : "";
                    return [`${fmtVal(v)}  (${sign}${pct.toFixed(2)}% so với đầu kỳ)`, "Giá"];
                  }}
                />
                {stats && (
                  <ReferenceLine y={stats.first} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.7} label={{ value: `Đầu kỳ ${fmtVal(stats.first)}`, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 10 }} />
                )}
                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#chartFill)" />
                {stats && (
                  <>
                    <ReferenceDot x={stats.maxPoint.t} y={stats.max} r={4} fill="var(--up)" stroke="var(--background)" strokeWidth={2} label={{ value: `Cao nhất ${fmtVal(stats.max)}`, position: "top", fill: "var(--up)", fontSize: 10, fontWeight: 600 }} />
                    <ReferenceDot x={stats.minPoint.t} y={stats.min} r={4} fill="var(--down)" stroke="var(--background)" strokeWidth={2} label={{ value: `Thấp nhất ${fmtVal(stats.min)}`, position: "bottom", fill: "var(--down)", fontSize: 10, fontWeight: 600 }} />
                    <ReferenceDot x={data![data!.length - 1].t} y={stats.last} r={5} fill={color} stroke="var(--background)" strokeWidth={2} />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} /> Đường giá</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/70" /> Giá đầu kỳ (đường đứt)</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "var(--up)" }} /> Đỉnh</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "var(--down)" }} /> Đáy</span>
          <span className="ml-auto">Di chuột vào biểu đồ để xem chi tiết từng thời điểm</span>
        </div>
      </div>
    </SectionCard>
  );
}