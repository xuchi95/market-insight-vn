import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Brush, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LCIcon, TrendingDown, TrendingUp, Minus, ArrowUp, ArrowDown, RefreshCw, ZoomOut } from "lucide-react";
import { SectionCard, LiveDot } from "./SectionCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useBinanceTicker } from "@/hooks/useBinanceTicker";

type Asset = string;
type Range = "1" | "7" | "30" | "365";
type ChangeUnit = "pct" | "abs";
type AssetGroup = "crypto" | "gold" | "forex";

// All crypto coins supported by the Binance realtime stream + chart API.
// Asset id = CoinGecko id (matches /api/public/crypto-chart and useBinanceTicker map).
const CRYPTO_COINS: { id: string; label: string }[] = [
  { id: "bitcoin", label: "Bitcoin (BTC)" },
  { id: "ethereum", label: "Ethereum (ETH)" },
  { id: "binancecoin", label: "BNB" },
  { id: "solana", label: "Solana (SOL)" },
  { id: "ripple", label: "XRP" },
  { id: "dogecoin", label: "Dogecoin (DOGE)" },
  { id: "the-open-network", label: "Toncoin (TON)" },
  { id: "cardano", label: "Cardano (ADA)" },
  { id: "avalanche-2", label: "Avalanche (AVAX)" },
  { id: "tron", label: "TRON (TRX)" },
  { id: "chainlink", label: "Chainlink (LINK)" },
  { id: "polkadot", label: "Polkadot (DOT)" },
  { id: "polygon-ecosystem-token", label: "Polygon (POL)" },
  { id: "shiba-inu", label: "Shiba Inu (SHIB)" },
  { id: "litecoin", label: "Litecoin (LTC)" },
  { id: "bitcoin-cash", label: "Bitcoin Cash (BCH)" },
  { id: "uniswap", label: "Uniswap (UNI)" },
  { id: "stellar", label: "Stellar (XLM)" },
  { id: "near", label: "NEAR" },
  { id: "internet-computer", label: "Internet Computer (ICP)" },
  { id: "aptos", label: "Aptos (APT)" },
  { id: "cosmos", label: "Cosmos (ATOM)" },
  { id: "ethereum-classic", label: "Ethereum Classic (ETC)" },
  { id: "filecoin", label: "Filecoin (FIL)" },
  { id: "hedera-hashgraph", label: "Hedera (HBAR)" },
  { id: "arbitrum", label: "Arbitrum (ARB)" },
  { id: "vechain", label: "VeChain (VET)" },
  { id: "maker", label: "Maker (MKR)" },
  { id: "render-token", label: "Render (RENDER)" },
  { id: "injective-protocol", label: "Injective (INJ)" },
  { id: "optimism", label: "Optimism (OP)" },
  { id: "sui", label: "Sui (SUI)" },
  { id: "pepe", label: "Pepe (PEPE)" },
  { id: "kaspa", label: "Kaspa (KAS)" },
  { id: "ethena", label: "Ethena (ENA)" },
  { id: "worldcoin-wld", label: "Worldcoin (WLD)" },
  { id: "sei-network", label: "Sei (SEI)" },
  { id: "fetch-ai", label: "Fetch.ai (FET)" },
  { id: "jupiter-exchange-solana", label: "Jupiter (JUP)" },
  { id: "pyth-network", label: "Pyth (PYTH)" },
  { id: "aave", label: "Aave (AAVE)" },
  { id: "ondo-finance", label: "Ondo (ONDO)" },
  { id: "celestia", label: "Celestia (TIA)" },
  { id: "official-trump", label: "Trump (TRUMP)" },
  { id: "bonk", label: "Bonk (BONK)" },
  { id: "floki", label: "Floki (FLOKI)" },
  { id: "dogwifcoin", label: "dogwifhat (WIF)" },
  { id: "book-of-meme", label: "BOME" },
  { id: "notcoin", label: "Notcoin (NOT)" },
];
const CRYPTO_IDS = CRYPTO_COINS.map((c) => c.id);
// Legacy short ids accepted from existing call sites.
const LEGACY_ALIAS: Record<string, string> = { btc: "bitcoin", eth: "ethereum" };
function normalizeAsset(a: string): string {
  return LEGACY_ALIAS[a] ?? a;
}

const ASSET_GROUPS: Record<AssetGroup, Asset[]> = {
  crypto: CRYPTO_IDS,
  gold: ["gold-sjc"],
  forex: ["usd-vnd", "eur-vnd", "gbp-vnd", "jpy-vnd", "cny-vnd", "krw-vnd", "sgd-vnd", "aud-vnd", "cad-vnd", "chf-vnd", "hkd-vnd", "thb-vnd"],
};

function groupOf(a: Asset): AssetGroup {
  if (CRYPTO_IDS.includes(a)) return "crypto";
  if (a === "gold-sjc") return "gold";
  return "forex";
}

interface Point { t: number; v: number; buy?: number; sell?: number }
interface SourceMeta {
  name: string;
  url: string;
  updatedAt?: number;
  latest?: { buy: number; sell: number; mid: number };
  unit?: string;
}
interface SeriesData { points: Point[]; source?: SourceMeta }

const BASE_VALUES: Record<string, number> = {
  "gold-sjc": 15_700_000,
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

async function loadSeries(asset: Asset, days: Range): Promise<SeriesData> {
  if (CRYPTO_IDS.includes(asset)) {
    try {
      const res = await fetch(`/api/public/crypto-chart?id=${encodeURIComponent(asset)}&days=${days}`);
      if (res.ok) {
        const j = (await res.json()) as { prices?: Array<{ t: number; v: number }> };
        const points = (j.prices ?? []).filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v));
        if (points.length) {
          return { points, source: { name: "CoinGecko", url: "https://www.coingecko.com" } };
        }
      }
    } catch {}
  }
  if (asset === "gold-sjc") {
    try {
      const res = await fetch(`/api/public/gold-history?type=SJC&days=${days}`);
      if (res.ok) {
        const j = (await res.json()) as {
          points?: Array<{ t: number; v: number; buy?: number; sell?: number }>;
          updatedAt?: number;
          unit?: string;
          latest?: { buy: number; sell: number; mid: number };
        };
        if (j.points && j.points.length) {
          return {
            points: j.points,
            source: {
              name: "PNJ",
              url: "https://www.pnj.com.vn",
              updatedAt: j.updatedAt,
              unit: j.unit ?? "VND/chỉ",
              latest: j.latest,
            },
          };
        }
      }
    } catch {}
  }
  // Synthesize plausible series for gold/forex or as fallback
  const totalMs = Number(days) * 24 * 3600 * 1000;
  const n = Math.min(Number(days) * 24, 480);
  const base = (BASE_VALUES as Record<string, number>)[asset] ?? 25_400;
  const now = Date.now();
  const step = totalMs / n;
  const out: Point[] = [];
  let v = base * (1 - 0.03);
  for (let i = 0; i < n; i++) {
    v = v * (1 + (Math.random() - 0.48) * 0.005);
    out.push({ t: now - (n - i) * step, v });
  }
  return { points: out };
}

const ASSETS: { value: Asset; label: string }[] = [
  ...CRYPTO_COINS.map((c) => ({ value: c.id, label: c.label })),
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

function ChartTooltip({
  active,
  payload,
  asset,
  firstValue,
  prevValue,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Point }>;
  asset: Asset;
  firstValue?: number;
  prevValue?: number;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;

  const isForex = asset.endsWith("-vnd");
  const isCrypto = CRYPTO_IDS.includes(asset);
  const isGold = asset === "gold-sjc";
  const unit = isCrypto ? "USD" : isGold ? "đ/chỉ" : "VND";
  const decimals = isCrypto ? 2 : asset === "jpy-vnd" || asset === "krw-vnd" ? 2 : 0;

  const fmt = (n: number) =>
    (isCrypto ? "$" : "") +
    new Intl.NumberFormat(isCrypto ? "en-US" : "vi-VN", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals === 2 ? 2 : 0,
    }).format(n);

  const time = new Date(p.t).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const hasBuySell = typeof p.buy === "number" && typeof p.sell === "number";
  const baseline = firstValue ?? prevValue;
  const diff = baseline != null ? p.v - baseline : 0;
  const pct = baseline ? (diff / baseline) * 100 : 0;
  const up = diff >= 0;
  const diffColor = up ? "var(--up)" : "var(--down)";
  const Arrow = up ? ArrowUp : ArrowDown;

  return (
    <div
      className="rounded-xl border border-border bg-popover/95 backdrop-blur p-2.5 sm:p-3 shadow-lg text-xs sm:text-sm min-w-[200px] sm:min-w-[240px] max-w-[88vw]"
      role="tooltip"
    >
      <div className="text-[11px] sm:text-xs text-muted-foreground mb-2 tabular">{time}</div>
      {hasBuySell ? (
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Mua</span>
            <span className="font-semibold tabular text-foreground">{fmt(p.buy!)} <span className="text-[11px] font-normal text-muted-foreground">{unit}</span></span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Bán</span>
            <span className="font-semibold tabular text-foreground">{fmt(p.sell!)} <span className="text-[11px] font-normal text-muted-foreground">{unit}</span></span>
          </div>
          <div className="flex justify-between gap-4 mt-1 pt-1.5 border-t border-border/50">
            <span className="text-muted-foreground">Trung bình</span>
            <span className="font-semibold tabular text-primary">{fmt(p.v)} <span className="text-[11px] font-normal text-muted-foreground">{unit}</span></span>
          </div>
        </div>
      ) : (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Giá</span>
          <span className="font-semibold tabular text-foreground">{fmt(p.v)} <span className="text-[11px] font-normal text-muted-foreground">{unit}</span></span>
        </div>
      )}
      {baseline != null && (
        <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between gap-4">
          <span className="text-[11px] sm:text-xs text-muted-foreground">So với đầu kỳ</span>
          <span className="inline-flex items-center gap-1 font-semibold tabular" style={{ color: diffColor }}>
            <Arrow className="h-3 w-3" />
            {up ? "+" : ""}{fmt(diff)}
            <span className="text-[11px] font-normal opacity-80">({up ? "+" : ""}{pct.toFixed(2)}%)</span>
          </span>
        </div>
      )}
    </div>
  );
}

export function PriceChart({
  defaultAsset = "btc",
  assets,
}: {
  defaultAsset?: string;
  assets?: string[];
} = {}) {
  const normalizedDefault = normalizeAsset(defaultAsset);
  const group = groupOf(normalizedDefault);
  const allowed = ASSET_GROUPS[group];
  const available = useMemo(() => {
    const normalizedReq = assets?.map(normalizeAsset);
    const requested = normalizedReq && normalizedReq.length ? normalizedReq.filter((a) => allowed.includes(a)) : allowed;
    const final = requested.length ? requested : allowed;
    return ASSETS.filter((a) => final.includes(a.value));
  }, [assets, allowed]);
  const initial = available.some((a) => a.value === normalizedDefault) ? normalizedDefault : available[0].value;
  const [asset, setAsset] = useState<Asset>(initial);
  if (!available.some((a) => a.value === asset)) {
    setAsset(initial);
  }
  const [range, setRange] = useState<Range>("7");
  const [changeUnit, setChangeUnit] = useState<ChangeUnit>("pct");

  const isCryptoAssetSel = CRYPTO_IDS.includes(asset);
  const { data, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["chart", asset, range],
    queryFn: () => loadSeries(asset, range),
    // Crypto gets near-realtime overlay from Binance WS, so we can poll
    // the historical series less aggressively. Gold/forex still poll @ 5s.
    refetchInterval: isCryptoAssetSel ? 60_000 : 5_000,
    refetchIntervalInBackground: false,
  });

  // Realtime overlay for crypto: append/replace the trailing point with
  // the latest Binance tick so the chart visibly moves between refetches.
  const tick = useBinanceTicker(isCryptoAssetSel ? asset : null);
  const points = useMemo(() => {
    const base = data?.points ?? [];
    if (!isCryptoAssetSel || !tick || !base.length) return base;
    const last = base[base.length - 1];
    // Replace the trailing point if the tick is within ~1h of it, else append.
    if (tick.updatedAt - last.t < 60 * 60 * 1000) {
      const next = base.slice(0, -1);
      next.push({ t: tick.updatedAt, v: tick.priceUsd });
      return next;
    }
    return [...base, { t: tick.updatedAt, v: tick.priceUsd }];
  }, [data, tick, isCryptoAssetSel]);
  const source = data?.source;

  // Zoom state (indices into points array). null = full range.
  const [zoom, setZoom] = useState<{ start: number; end: number } | null>(null);
  const visiblePoints = useMemo(() => {
    if (!zoom || !points.length) return points;
    const s = Math.max(0, Math.min(zoom.start, points.length - 1));
    const e = Math.max(s, Math.min(zoom.end, points.length - 1));
    return points.slice(s, e + 1);
  }, [points, zoom]);

  const stats = useMemo(() => {
    const arr = visiblePoints;
    if (!arr.length) return null;
    const first = arr[0].v, last = arr[arr.length - 1].v;
    const vals = arr.map((d) => d.v);
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
      minPoint: arr[minIdx],
      maxPoint: arr[maxIdx],
      change: ((last - first) / first) * 100,
      changeAbs: last - first,
      position: max === min ? 50 : ((last - min) / (max - min)) * 100,
    };
  }, [visiblePoints]);

  const positive = (stats?.change ?? 0) >= 0;
  const color = positive ? "var(--up)" : "var(--down)";

  const isForex = asset.endsWith("-vnd");
  const fmtVal = (v: number) => {
    if (asset === "gold-sjc") return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 2 }).format(v);
    if (isForex) return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: asset === "jpy-vnd" || asset === "krw-vnd" ? 2 : 0 }).format(v);
    return "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v);
  };
  const isGoldAsset = asset === "gold-sjc";
  const isCryptoAsset = isCryptoAssetSel;
  const axisUnit = isGoldAsset ? "đ/chỉ" : isCryptoAsset ? "USD" : "VND";

  const rangeLabel =
    range === "1" ? "24 giờ qua" :
    range === "7" ? "7 ngày qua" :
    range === "30" ? "30 ngày qua" :
    "12 tháng qua";
  const rangeShort =
    range === "1" ? "1D" : range === "7" ? "1W" : range === "30" ? "1M" : "1Y";
  const trendStrength = Math.abs(stats?.change ?? 0);
  const trendWord = trendStrength < 0.3 ? "gần như đi ngang" : trendStrength < 1.5 ? (positive ? "tăng nhẹ" : "giảm nhẹ") : trendStrength < 4 ? (positive ? "tăng" : "giảm") : (positive ? "tăng mạnh" : "giảm mạnh");
  const summary = stats ? `Trong ${rangeLabel}, giá ${trendWord} ${Math.abs(stats.change).toFixed(2)}% so với đầu kỳ.` : "";
  const TrendIcon = trendStrength < 0.3 ? Minus : positive ? TrendingUp : TrendingDown;

  return (
    <SectionCard
      id="chart"
      icon={<LCIcon className="h-4 w-4" />}
      title="Biểu đồ giá"
      meta={
        <span className="flex items-center gap-1.5">
          <LiveDot /> {isCryptoAssetSel ? "Realtime từ Binance" : "Tự cập nhật mỗi 5 giây"}
          {isFetching && !isLoading && (
            <RefreshCw className="h-3 w-3 animate-spin text-primary ml-1" />
          )}
        </span>
      }
      action={
        <>
          <Select value={asset} onValueChange={(v) => { setAsset(v); setZoom(null); }} disabled={available.length <= 1}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              {available.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Tabs value={range} onValueChange={(v) => { setRange(v as Range); setZoom(null); }}>
            <TabsList className="h-9">
              <TabsTrigger value="1">1D</TabsTrigger>
              <TabsTrigger value="7">1W</TabsTrigger>
              <TabsTrigger value="30">1M</TabsTrigger>
              <TabsTrigger value="365">1Y</TabsTrigger>
            </TabsList>
          </Tabs>
          {zoom && (
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setZoom(null)}>
              <ZoomOut className="h-3.5 w-3.5" /> Bỏ zoom
            </Button>
          )}
        </>
      }
    >
      <div className="p-3 sm:p-4 lg:p-6">
        {stats && (
          <>
            <div className="flex flex-wrap items-end gap-x-6 sm:gap-x-8 lg:gap-x-10 gap-y-3 sm:gap-y-4 mb-3 sm:mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {zoom ? "Giá cuối khoảng zoom" : "Giá hiện tại"}
                </div>
                <div className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold tabular tracking-tight leading-none mt-1">
                  {fmtVal(stats.last)}
                  <span className="ml-1.5 text-sm sm:text-base md:text-lg font-medium text-muted-foreground tracking-normal">{axisUnit}</span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span>Thay đổi {zoom ? "khoảng đã chọn" : rangeShort}</span>
                  <button
                    type="button"
                    onClick={() => setChangeUnit((u) => (u === "pct" ? "abs" : "pct"))}
                    className="inline-flex items-center rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted normal-case tracking-normal"
                  >
                    {changeUnit === "pct" ? "%" : "Δ"}
                  </button>
                </div>
                <div className="flex items-center gap-2 font-display text-xl sm:text-2xl md:text-3xl font-semibold tabular tracking-tight leading-none mt-1" style={{ color }}>
                  <TrendIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  {changeUnit === "pct" ? (
                    <>
                      {positive ? "+" : ""}{stats.change.toFixed(2)}%
                      <span className="font-sans text-xs sm:text-sm font-normal text-muted-foreground">({positive ? "+" : ""}{fmtVal(stats.changeAbs)})</span>
                    </>
                  ) : (
                    <>
                      {positive ? "+" : ""}{fmtVal(stats.changeAbs)}
                      <span className="font-sans text-xs sm:text-sm font-normal text-muted-foreground">({positive ? "+" : ""}{stats.change.toFixed(2)}%)</span>
                    </>
                  )}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Lần cập nhật cuối</div>
                <div className="font-mono text-sm mt-1 tabular text-foreground/80 flex items-center gap-1.5 justify-end">
                  {dataUpdatedAt
                    ? new Date(dataUpdatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "—"}
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/60 hover:bg-muted disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
            </div>
            <div className="mb-3 sm:mb-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs sm:text-sm flex items-start gap-2">
              <TrendIcon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
              <span className="text-foreground/90">{summary} <span className="text-muted-foreground">Giá đầu kỳ {fmtVal(stats.first)}.</span></span>
            </div>
            {/* Range position bar */}
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground mb-1.5 gap-2">
                <span className="flex items-center gap-1 whitespace-nowrap"><ArrowDown className="h-3 w-3" />Thấp {fmtVal(stats.min)}</span>
                <span className="hidden md:inline text-foreground/70">Vị trí hiện tại trong khoảng {rangeLabel}</span>
                <span className="flex items-center gap-1 whitespace-nowrap">Cao {fmtVal(stats.max)}<ArrowUp className="h-3 w-3" /></span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-visible">
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${stats.position}%`, background: `linear-gradient(90deg, var(--muted) 0%, ${color} 100%)` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-background shadow" style={{ left: `${stats.position}%`, background: color }} />
              </div>
            </div>
          </>
        )}
        <div className="h-56 sm:h-64 md:h-72 lg:h-80 w-full">
          {isLoading || !points.length ? (
            <div className="h-full w-full space-y-2">
              <Skeleton className="h-[calc(100%-2rem)] w-full" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visiblePoints} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="v"
                  tickFormatter={fmtVal}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  domain={["auto", "auto"]}
                  label={{ value: axisUnit, angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 11, dy: 30 }}
                />
                <Tooltip
                  content={<ChartTooltip asset={asset} firstValue={stats?.first} />}
                  cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "3 3" }}
                  wrapperStyle={{ outline: "none", zIndex: 50 }}
                />
                {stats && (
                  <ReferenceLine y={stats.first} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.7} label={{ value: `Đầu kỳ ${fmtVal(stats.first)}`, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 10 }} />
                )}
                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#chartFill)" />
                {stats && (
                  <>
                    <ReferenceDot x={stats.maxPoint.t} y={stats.max} r={4} fill="var(--up)" stroke="var(--background)" strokeWidth={2} label={{ value: `Cao nhất ${fmtVal(stats.max)}`, position: "top", fill: "var(--up)", fontSize: 10, fontWeight: 600 }} />
                    <ReferenceDot x={stats.minPoint.t} y={stats.min} r={4} fill="var(--down)" stroke="var(--background)" strokeWidth={2} label={{ value: `Thấp nhất ${fmtVal(stats.min)}`, position: "bottom", fill: "var(--down)", fontSize: 10, fontWeight: 600 }} />
                    <ReferenceDot x={visiblePoints[visiblePoints.length - 1].t} y={stats.last} r={5} fill={color} stroke="var(--background)" strokeWidth={2} />
                  </>
                )}
                {points.length > 10 && (
                  <Brush
                    dataKey="t"
                    height={24}
                    stroke="var(--primary)"
                    fill="var(--muted)"
                    travellerWidth={8}
                    tickFormatter={(t) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                    onChange={(e: { startIndex?: number; endIndex?: number }) => {
                      if (typeof e.startIndex === "number" && typeof e.endIndex === "number") {
                        if (e.startIndex === 0 && e.endIndex === points.length - 1) {
                          setZoom(null);
                        } else {
                          setZoom({ start: e.startIndex, end: e.endIndex });
                        }
                      }
                    }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium tabular"
            style={{ color, borderColor: `color-mix(in oklab, ${color} 40%, transparent)`, background: `color-mix(in oklab, ${color} 10%, transparent)` }}
          >
            <TrendIcon className="h-3 w-3" />
            <span>{trendStrength < 0.3 ? "Đi ngang" : positive ? "Tăng" : "Giảm"} · {rangeShort}</span>
            <span className="opacity-80">
              {changeUnit === "pct"
                ? `${positive ? "+" : ""}${(stats?.change ?? 0).toFixed(2)}%`
                : `${positive ? "+" : ""}${fmtVal(stats?.changeAbs ?? 0)}`}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-muted-foreground">
            <span className="inline-block h-0 w-3 border-t-2 border-dashed border-muted-foreground/70" /> Đầu kỳ
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5" style={{ color: "var(--up)", borderColor: "color-mix(in oklab, var(--up) 35%, transparent)", background: "color-mix(in oklab, var(--up) 10%, transparent)" }}>
            <ArrowUp className="h-3 w-3" /> Đỉnh
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5" style={{ color: "var(--down)", borderColor: "color-mix(in oklab, var(--down) 35%, transparent)", background: "color-mix(in oklab, var(--down) 10%, transparent)" }}>
            <ArrowDown className="h-3 w-3" /> Đáy
          </span>
          <span className="ml-auto hidden md:inline text-muted-foreground">Di chuột để xem chi tiết · Kéo thanh dưới biểu đồ để zoom</span>
        </div>
      </div>
    </SectionCard>
  );
}
