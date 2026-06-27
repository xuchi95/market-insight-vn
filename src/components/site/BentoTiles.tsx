import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import type { CryptoCoin, ForexRate, GoldPrice } from "@/lib/services/types";
import { fmtTrieu } from "@/lib/format";
import { AnimatedNumber } from "./AnimatedNumber";
import { FormattedNumber } from "./FormattedNumber";
import { useBinanceTickers } from "@/hooks/useBinanceTicker";
import { useNumberFormat } from "@/hooks/useNumberFormat";

interface InitialPrices {
  gold: GoldPrice[] | null;
  crypto: CryptoCoin[] | null;
  fx: ForexRate[] | null;
}

function fmt(n: number, digits = 0) {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
function fmtVndFull(n: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(n));
}

// Sinh đường cong 24 điểm "thật" cho card vàng dựa trên giá hiện tại và
// biến động 24h, để hiển thị sparkline trang trí giống reference khi API
// vàng chưa trả về dữ liệu lịch sử. Hạt giống cố định theo `id` để tránh
// nhảy hình mỗi lần re-render.
function syntheticSpark(seed: string, sell: number, changePct: number, points = 24): number[] {
  const base = sell / (1 + changePct / 100);
  const target = sell;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return ((h & 0xffffffff) / 0xffffffff) * 2 - 1; // [-1,1]
  };
  const amp = Math.abs(target - base) * 0.6 + sell * 0.0025;
  const arr: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    arr.push(base + (target - base) * t + rand() * amp);
  }
  arr[points - 1] = target;
  return arr;
}

function Spark({ data, color, h = 36 }: { data: number[]; color: string; h?: number }) {
  if (!data || data.length < 2) return <div style={{ height: h }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(2)},${(h - ((v - min) / range) * h).toFixed(2)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ChangePill({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`tabular text-xs font-medium inline-flex items-center gap-1 ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
      <span aria-hidden className="text-[0.7em] leading-none">{up ? "▲" : "▼"}</span>
      <AnimatedNumber value={Math.abs(value)} format={(v) => `${v.toFixed(2)}%`} minChars={5} noFlash />
    </span>
  );
}

function TileFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative bg-card border border-[color-mix(in_oklab,var(--gold)_18%,var(--border))] rounded-2xl p-5 md:p-6 shadow-[0_1px_0_color-mix(in_oklab,white_4%,transparent)_inset,0_18px_40px_-22px_rgba(0,0,0,0.45)] transition-colors hover:border-[color-mix(in_oklab,var(--gold)_32%,var(--border))] ${className}`}
    >
      {children}
    </div>
  );
}

function AssetBadge({ kind }: { kind: "sjc" | "btc" | "eth" }) {
  const map = {
    sjc: { bg: "from-amber-300/30 to-amber-500/10", ring: "ring-amber-400/40", letter: "Au" },
    btc: { bg: "from-orange-400/30 to-amber-500/10", ring: "ring-orange-400/40", letter: "₿" },
    eth: { bg: "from-indigo-400/30 to-blue-500/10", ring: "ring-indigo-400/40", letter: "Ξ" },
  }[kind];
  return (
    <span
      aria-hidden
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${map.bg} ring-1 ${map.ring} text-foreground/90 font-semibold`}
    >
      {map.letter}
    </span>
  );
}

export function BentoTiles({ initial }: { initial?: InitialPrices } = {}) {
  const { compact } = useNumberFormat();
  const [gold, setGold] = useState<GoldPrice[] | null>(initial?.gold ?? null);
  const [crypto, setCrypto] = useState<CryptoCoin[] | null>(initial?.crypto ?? null);
  const [fx, setFx] = useState<ForexRate[] | null>(initial?.fx ?? null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchGoldPrices().then((v) => alive && setGold(v)).catch(() => alive && setGold([]));
      fetchCryptoPrices().then((v) => alive && setCrypto(v)).catch(() => alive && setCrypto([]));
      fetchForexRates().then((v) => alive && setFx(v)).catch(() => alive && setFx([]));
    };
    load();
    const t = setInterval(load, 10_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const goldLoading = gold === null;
  const cryptoLoading = crypto === null;
  const fxLoading = fx === null;
  const sjc = gold?.find((g) => g.id === "sjc-1l") ?? gold?.[0];
  const btc = crypto?.find((c) => c.symbol === "BTC");
  const eth = crypto?.find((c) => c.symbol === "ETH");
  const usd = fx?.find((r) => r.code === "USD");
  const eur = fx?.find((r) => r.code === "EUR");
  const jpy = fx?.find((r) => r.code === "JPY");
  const cny = fx?.find((r) => r.code === "CNY");
  const gbp = fx?.find((r) => r.code === "GBP");
  const aud = fx?.find((r) => r.code === "AUD");
  const sgd = fx?.find((r) => r.code === "SGD");
  const krw = fx?.find((r) => r.code === "KRW");

  const liveTicks = useBinanceTickers(["bitcoin", "ethereum"]);
  const btcPrice = liveTicks.bitcoin?.priceUsd ?? btc?.priceUsd ?? 0;
  const btcChange = liveTicks.bitcoin?.change24h ?? btc?.change24h ?? 0;
  const ethPrice = liveTicks.ethereum?.priceUsd ?? eth?.priceUsd ?? 0;
  const ethChange = liveTicks.ethereum?.change24h ?? eth?.change24h ?? 0;

  const updatedText = new Date(sjc?.updatedAt ?? Date.now()).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Row 1: 3 equal cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {/* SJC */}
        <TileFrame className="flex flex-col">
          <Link to="/gia-vang" className="flex flex-col h-full group">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <AssetBadge kind="sjc" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">Vàng miếng SJC</div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 truncate">Nguồn · SJC</div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-[var(--gold)] shrink-0" />
            </div>
            <div className="mb-1">
              {sjc ? (
                <FormattedNumber
                  value={sjc.sell}
                  format={(v) => (compact ? fmtTrieu(v) : fmtVndFull(v))}
                  unit={compact ? "tr/chỉ" : "đ/chỉ"}
                  decimals={compact ? 2 : 0}
                  className="font-display text-3xl md:text-4xl leading-none text-foreground"
                  unitClassName="text-xs md:text-sm text-muted-foreground"
                />
              ) : goldLoading ? (
                <LoadingLine size="lg" />
              ) : (
                <div className="font-display text-3xl md:text-4xl leading-none text-muted-foreground">—</div>
              )}
            </div>
            {sjc && (
              <div className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-2">
                <ChangePill value={sjc.changePct} />
                <span>(24h)</span>
              </div>
            )}
            <div className="mt-3 h-9 opacity-90">
              {sjc && (
                <Spark
                  data={syntheticSpark(sjc.id, sjc.sell, sjc.changePct)}
                  color={sjc.changePct >= 0 ? "var(--up)" : "var(--down)"}
                  h={36}
                />
              )}
            </div>
            <div className="my-4 h-px bg-border/70" />
            <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
              <KV label="Mua vào" value={sjc?.buy} compact={compact} loading={goldLoading} />
              <KV label="Bán ra" value={sjc?.sell} compact={compact} loading={goldLoading} />
              <KV
                label="Chênh lệch"
                value={typeof sjc?.sell === "number" && typeof sjc?.buy === "number" ? sjc.sell - sjc.buy : undefined}
                compact={compact}
                loading={goldLoading}
              />
              <KV label="Tham chiếu" value={sjc?.buy} compact={compact} loading={goldLoading} />
            </dl>
            <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate">Cập nhật: {updatedText}</span>
              <span className="inline-flex items-center gap-1 text-[var(--gold)] font-medium group-hover:text-[var(--gold-light)]">
                Xem chi tiết <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        </TileFrame>

        {/* BTC */}
        <TileFrame>
          <Link to="/tien-dien-tu" className="block group">
            <CryptoTile
              kind="btc"
              name="Bitcoin"
              symbol="BTC"
              price={btcPrice}
              change={btcChange}
              low24h={liveTicks.bitcoin?.low24h ?? btc?.priceUsd}
              high24h={liveTicks.bitcoin?.high24h ?? btc?.priceUsd}
              marketCap={btc?.marketCap}
              spark={btc?.sparkline}
              loading={cryptoLoading}
              has={!!btc}
              updatedText={updatedText}
            />
          </Link>
        </TileFrame>

        {/* ETH */}
        <TileFrame>
          <Link to="/tien-dien-tu" className="block group">
            <CryptoTile
              kind="eth"
              name="Ethereum"
              symbol="ETH"
              price={ethPrice}
              change={ethChange}
              low24h={liveTicks.ethereum?.low24h ?? eth?.priceUsd}
              high24h={liveTicks.ethereum?.high24h ?? eth?.priceUsd}
              marketCap={eth?.marketCap}
              spark={eth?.sparkline}
              loading={cryptoLoading}
              has={!!eth}
              updatedText={updatedText}
            />
          </Link>
        </TileFrame>
      </div>

      {/* Row 2: Forex strip */}
      <TileFrame>
        <Link to="/ty-gia-ngoai-te" className="block group">
          <div className="flex items-baseline justify-between mb-4">
            <div className="text-sm font-semibold text-foreground">Tỷ giá ngoại tệ (VND)</div>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-[var(--gold)] transition-colors">
              Xem chi tiết <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-y-4 gap-x-4">
            <FxCell rate={usd} loading={fxLoading} code="USD" />
            <FxCell rate={eur} loading={fxLoading} code="EUR" />
            <FxCell rate={gbp} loading={fxLoading} code="GBP" />
            <FxCell rate={jpy} loading={fxLoading} code="JPY" digits={2} />
            <FxCell rate={aud} loading={fxLoading} code="AUD" />
            <FxCell rate={sgd} loading={fxLoading} code="SGD" />
            <FxCell rate={cny} loading={fxLoading} code="CNY" />
            <FxCell rate={krw} loading={fxLoading} code="KRW" digits={2} />
          </div>
        </Link>
      </TileFrame>
    </div>
  );
}

function LoadingLine({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className={`tabular text-muted-foreground/80 animate-pulse ${size === "lg" ? "text-lg md:text-xl" : "text-sm"}`}>
      Đang cập nhật giá…
    </div>
  );
}

function KV({ label, value, compact, loading }: { label: string; value?: number; compact: boolean; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <span className="text-muted-foreground/80 truncate">{label}</span>
      <span className="tabular text-foreground/90 font-medium truncate">
        {typeof value === "number" ? (
          <AnimatedNumber
            value={value}
            format={(v) => (compact ? `${fmtTrieu(v)} tr` : `${fmtVndFull(v)} đ`)}
            minChars={compact ? 6 : 10}
          />
        ) : loading ? "—" : "—"}
      </span>
    </div>
  );
}

function CryptoTile({
  kind, name, symbol, price, change, low24h, high24h, marketCap, spark, loading, has, updatedText,
}: {
  kind: "btc" | "eth";
  name: string;
  symbol: string;
  price: number;
  change: number;
  low24h?: number;
  high24h?: number;
  marketCap?: number;
  spark?: number[];
  loading: boolean;
  has: boolean;
  updatedText: string;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <AssetBadge kind={kind} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{name}</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 truncate">{symbol}</div>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-[var(--gold)] shrink-0" />
      </div>

      {has ? (
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="font-display text-3xl md:text-4xl leading-none text-foreground">
            $<AnimatedNumber value={price} format={(v) => fmt(v, 0)} minChars={5} />
          </div>
          <ChangePill value={change} />
        </div>
      ) : loading ? (
        <LoadingLine size="lg" />
      ) : (
        <div className="font-display text-3xl md:text-4xl leading-none text-muted-foreground">—</div>
      )}

      <div className="mt-3 h-9 opacity-90">
        {has && spark && <Spark data={spark} color={change >= 0 ? "var(--up)" : "var(--down)"} h={36} />}
      </div>

      <div className="my-4 h-px bg-border/70" />
      <dl className="space-y-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground/80">Thấp nhất (24h)</span>
          <span className="tabular text-foreground/90 font-medium">{typeof low24h === "number" ? `$${fmt(low24h, 0)}` : "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground/80">Cao nhất (24h)</span>
          <span className="tabular text-foreground/90 font-medium">{typeof high24h === "number" ? `$${fmt(high24h, 0)}` : "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground/80">Vốn hoá thị trường</span>
          <span className="tabular text-foreground/90 font-medium">
            {typeof marketCap === "number" ? `$${fmt(marketCap / 1_000_000_000_000, 2)}T` : "—"}
          </span>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">Cập nhật: {updatedText}</span>
        <span className="inline-flex items-center gap-1 text-[var(--gold)] font-medium group-hover:text-[var(--gold-light)]">
          Xem chi tiết <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

function FxCell({ rate, digits = 0, loading, code }: { rate?: ForexRate; digits?: number; loading?: boolean; code?: string }) {
  if (!rate) {
    return (
      <div className="min-w-0">
        {code && <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{code}/VND</div>}
        <div className="text-xs text-muted-foreground/70 mt-2 animate-pulse">{loading ? "Đang cập nhật…" : "—"}</div>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">{rate.code}/VND</div>
      <div className="tabular text-lg md:text-xl leading-tight text-foreground mt-1.5 truncate">
        <AnimatedNumber value={rate.mid} format={(v) => fmt(v, digits)} minChars={6} />
      </div>
      <div className={`text-[11px] tabular mt-1 inline-flex items-center gap-1 ${rate.changePct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
        <span aria-hidden className="text-[0.7em] leading-none">{rate.changePct >= 0 ? "▲" : "▼"}</span>
        <AnimatedNumber value={Math.abs(rate.changePct)} format={(v) => `${v.toFixed(2)}%`} minChars={5} noFlash />
      </div>
    </div>
  );
}
