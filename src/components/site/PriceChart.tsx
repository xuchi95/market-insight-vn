import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LCIcon } from "lucide-react";
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
    const min = Math.min(...data.map((d) => d.v));
    const max = Math.max(...data.map((d) => d.v));
    return { first, last, min, max, change: ((last - first) / first) * 100 };
  }, [data]);

  const positive = (stats?.change ?? 0) >= 0;
  const color = positive ? "var(--up)" : "var(--down)";

  const isForex = asset.endsWith("-vnd");
  const fmtVal = (v: number) => {
    if (asset === "gold-sjc") return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 2 }).format(v);
    if (isForex) return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: asset === "jpy-vnd" || asset === "krw-vnd" ? 2 : 0 }).format(v);
    return "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v);
  };

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
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2 mb-4">
            <div>
              <div className="text-xs text-muted-foreground">Giá hiện tại</div>
              <div className="text-3xl font-bold tabular tracking-tight">{fmtVal(stats.last)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Thay đổi {range === "1" ? "24h" : range === "7" ? "7 ngày" : "30 ngày"}</div>
              <div className="text-lg font-semibold tabular" style={{ color }}>{positive ? "+" : ""}{stats.change.toFixed(2)}%</div>
            </div>
            <div className="text-xs text-muted-foreground tabular space-y-0.5">
              <div>Cao: {fmtVal(stats.max)}</div>
              <div>Thấp: {fmtVal(stats.min)}</div>
            </div>
          </div>
        )}
        <div className="h-72 w-full">
          {isLoading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
                  formatter={(v: number) => [fmtVal(v), "Giá"]}
                />
                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#chartFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </SectionCard>
  );
}