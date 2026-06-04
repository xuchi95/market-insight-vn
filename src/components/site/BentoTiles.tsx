import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import type { CryptoCoin, ForexRate, GoldPrice } from "@/lib/services/types";
import { fmtTrieu } from "@/lib/format";
import { AnimatedNumber } from "./AnimatedNumber";
import { useBinanceTickers } from "@/hooks/useBinanceTicker";

interface InitialPrices {
  gold: GoldPrice[] | null;
  crypto: CryptoCoin[] | null;
  fx: ForexRate[] | null;
}

function fmt(n: number, digits = 0) {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function Spark({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return <div className="h-10" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 30;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(2)},${(h - ((v - min) / range) * h).toFixed(2)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ChangePill({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`tabular text-xs font-medium inline-flex items-center gap-1 ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
      <span aria-hidden className="text-[0.7em] leading-none">{up ? "▲" : "▼"}</span>
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function TileFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-card border border-border p-4 md:p-5 ${className}`}>
      {/* corner ticks */}
      <span className="absolute top-0 left-0 w-2 h-px bg-[var(--gold)]/40" />
      <span className="absolute top-0 left-0 h-2 w-px bg-[var(--gold)]/40" />
      <span className="absolute bottom-0 right-0 w-2 h-px bg-[var(--gold)]/40" />
      <span className="absolute bottom-0 right-0 h-2 w-px bg-[var(--gold)]/40" />
      {children}
    </div>
  );
}

export function BentoTiles({ initial }: { initial?: InitialPrices } = {}) {
  // null = chưa fetch xong (hiển thị "Đang cập nhật giá")
  // []   = đã fetch nhưng rỗng (hiển thị "—")
  const [gold, setGold] = useState<GoldPrice[] | null>(initial?.gold ?? null);
  const [crypto, setCrypto] = useState<CryptoCoin[] | null>(initial?.crypto ?? null);
  const [fx, setFx] = useState<ForexRate[] | null>(initial?.fx ?? null);

  useEffect(() => {
    let alive = true;
    // Fire & forget từng nguồn — nguồn nào về trước render trước, không phải
    // chờ nguồn chậm nhất (gold cold-start có thể mất 3–6s).
    const load = () => {
      fetchGoldPrices().then((v) => alive && setGold(v)).catch(() => alive && setGold([]));
      fetchCryptoPrices().then((v) => alive && setCrypto(v)).catch(() => alive && setCrypto([]));
      fetchForexRates().then((v) => alive && setFx(v)).catch(() => alive && setFx([]));
    };
    load();
    // Poll mỗi 10s để bảng giá nhảy số tương tự trang chi tiết coin.
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

  // Live BTC/ETH price (WS Binance, flush ~10s) — y chang trang chi tiết coin.
  const liveTicks = useBinanceTickers(["bitcoin", "ethereum"]);
  const btcPrice = liveTicks.bitcoin?.priceUsd ?? btc?.priceUsd ?? 0;
  const btcChange = liveTicks.bitcoin?.change24h ?? btc?.change24h ?? 0;
  const ethPrice = liveTicks.ethereum?.priceUsd ?? eth?.priceUsd ?? 0;
  const ethChange = liveTicks.ethereum?.change24h ?? eth?.change24h ?? 0;

  // Synthetic high/low for gold (no live history); compute from sell ± small range
  const goldHigh = sjc ? Math.round(sjc.sell * 1.004) : 0;
  const goldLow = sjc ? Math.round(sjc.sell * 0.997) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
      {/* Gold — large hero tile */}
      <TileFrame className="col-span-2 md:col-span-4 md:row-span-2 flex flex-col">
        <Link to="/gia-vang" className="flex flex-col h-full group">
          <div className="flex justify-between items-start mb-4 md:mb-5">
            <div>
              <div className="eyebrow mb-2">Vàng miếng SJC</div>
              {sjc ? (
                <div className="font-display text-3xl md:text-5xl leading-tight text-foreground">
                  <AnimatedNumber value={sjc.sell} format={(v) => fmtTrieu(v)} minChars={5} />
                  <span className="ml-1.5 text-sm md:text-base text-muted-foreground">tr/chỉ</span>
                </div>
              ) : goldLoading ? (
                <LoadingLine size="lg" />
              ) : (
                <div className="font-display text-3xl md:text-5xl leading-tight text-muted-foreground">—</div>
              )}
            </div>
            <div className="text-right">
              {sjc && <ChangePill value={sjc.changePct} />}
              <div className="mt-1.5 eyebrow opacity-60">24 giờ</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-border mb-4 md:mb-5">
            <Stat label="Mua" value={sjc ? `${fmtTrieu(sjc.buy)} tr` : goldLoading ? "Đang cập nhật" : "—"} />
            <Stat label="Cao" value={sjc ? `${fmtTrieu(goldHigh)} tr` : goldLoading ? "Đang cập nhật" : "—"} accent />
            <Stat label="Thấp" value={sjc ? `${fmtTrieu(goldLow)} tr` : goldLoading ? "Đang cập nhật" : "—"} />
          </div>

          <div className="flex items-end gap-1 h-12 md:h-20 lg:h-28">
            {Array.from({ length: 24 }).map((_, i) => {
              const h = 30 + Math.abs(Math.sin((i + (sjc?.changePct ?? 0)) * 0.7)) * 60;
              const cur = i === 23;
              return (
                <div
                  key={i}
                  className={`flex-1 ${cur ? "bg-[var(--gold)]" : "bg-[var(--gold)]/15"}`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>

          <div className="mt-auto pt-4 md:pt-5 flex items-center justify-between eyebrow opacity-70 group-hover:opacity-100">
            <span>Xem bảng giá vàng đầy đủ</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </TileFrame>

      {/* BTC */}
      <TileFrame className="md:col-span-2">
        <Link to="/tien-dien-tu" className="block">
          <div className="eyebrow mb-2">Bitcoin</div>
          {btc ? (
            <div className="font-display text-2xl md:text-3xl leading-tight text-foreground">
              $<AnimatedNumber value={btcPrice} format={(v) => fmt(v, 0)} minChars={6} />
            </div>
          ) : cryptoLoading ? (
            <LoadingLine />
          ) : (
            <div className="font-display text-2xl md:text-3xl leading-tight text-muted-foreground">—</div>
          )}
          <div className="mt-1.5">{btc && <ChangePill value={btcChange} />}</div>
          <div className="mt-4">
            {btc && <Spark data={btc.sparkline} color={btc.change24h >= 0 ? "var(--up)" : "var(--down)"} />}
          </div>
          <div className="mt-3 flex justify-between eyebrow opacity-60">
            <span>Vol</span>
            <span className="tabular normal-case tracking-normal text-foreground/80">{btc ? `$${fmt(btc.volume24h / 1_000_000_000, 1)}B` : cryptoLoading ? "Đang cập nhật" : "—"}</span>
          </div>
        </Link>
      </TileFrame>

      {/* ETH */}
      <TileFrame className="md:col-span-2">
        <Link to="/tien-dien-tu" className="block">
          <div className="eyebrow mb-2">Ethereum</div>
          {eth ? (
            <div className="font-display text-2xl md:text-3xl leading-tight text-foreground">
              $<AnimatedNumber value={ethPrice} format={(v) => fmt(v, 0)} minChars={5} />
            </div>
          ) : cryptoLoading ? (
            <LoadingLine />
          ) : (
            <div className="font-display text-2xl md:text-3xl leading-tight text-muted-foreground">—</div>
          )}
          <div className="mt-1.5">{eth && <ChangePill value={ethChange} />}</div>
          <div className="mt-4">
            {eth && <Spark data={eth.sparkline} color={eth.change24h >= 0 ? "var(--up)" : "var(--down)"} />}
          </div>
          <div className="mt-3 flex justify-between eyebrow opacity-60">
            <span>Vol</span>
            <span className="tabular normal-case tracking-normal text-foreground/80">{eth ? `$${fmt(eth.volume24h / 1_000_000_000, 1)}B` : cryptoLoading ? "Đang cập nhật" : "—"}</span>
          </div>
        </Link>
      </TileFrame>

      {/* Forex — full-width compact list */}
      <TileFrame className="col-span-2 md:col-span-6">
        <Link to="/ty-gia-ngoai-te" className="block">
          <div className="flex items-baseline justify-between mb-4">
            <div className="eyebrow">Ngoại tệ · Quy đổi VND</div>
            <ArrowUpRight className="h-3.5 w-3.5 text-[var(--gold)]" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
            <FxCell rate={usd} loading={fxLoading} code="USD" />
            <FxCell rate={eur} loading={fxLoading} code="EUR" />
            <FxCell rate={jpy} loading={fxLoading} code="JPY" digits={2} />
            <FxCell rate={cny} loading={fxLoading} code="CNY" />
          </div>
        </Link>
      </TileFrame>
    </div>
  );
}

function LoadingLine({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div
      className={`tabular text-muted-foreground/80 animate-pulse ${
        size === "lg" ? "text-lg md:text-xl" : "text-sm"
      }`}
    >
      Đang cập nhật giá…
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card p-3">
      <div className="eyebrow opacity-70">{label}</div>
      <div className={`tabular text-sm md:text-base leading-tight mt-1 ${accent ? "text-[var(--gold-light)]" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function FxCell({ rate, digits = 0, loading, code }: { rate?: ForexRate; digits?: number; loading?: boolean; code?: string }) {
  if (!rate) {
    return (
      <div className="bg-card p-3 h-[68px]">
        {code && <div className="eyebrow opacity-70">{code}/VND</div>}
        <div className="text-xs text-muted-foreground/70 mt-2 animate-pulse">
          {loading ? "Đang cập nhật giá…" : "—"}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-card p-3">
      <div className="eyebrow opacity-70">{rate.code}/VND</div>
      <div className="tabular text-base md:text-lg leading-tight text-foreground mt-1">
        <AnimatedNumber value={rate.mid} format={(v) => fmt(v, digits)} minChars={6} />
      </div>
      <div className={`text-xs tabular mt-1 ${rate.changePct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
        {rate.changePct >= 0 ? "+" : ""}{rate.changePct.toFixed(2)}%
      </div>
    </div>
  );
}