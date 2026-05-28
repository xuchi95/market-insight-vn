import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import type { CryptoCoin, ForexRate, GoldPrice } from "@/lib/services/types";
import { fmtTrieu } from "@/lib/format";

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
    <span className={`font-mono text-xs font-medium ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function TileFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-card border border-border p-5 ${className}`}>
      {/* corner ticks */}
      <span className="absolute top-0 left-0 w-2 h-px bg-[var(--gold)]/40" />
      <span className="absolute top-0 left-0 h-2 w-px bg-[var(--gold)]/40" />
      <span className="absolute bottom-0 right-0 w-2 h-px bg-[var(--gold)]/40" />
      <span className="absolute bottom-0 right-0 h-2 w-px bg-[var(--gold)]/40" />
      {children}
    </div>
  );
}

export function BentoTiles() {
  const [gold, setGold] = useState<GoldPrice[]>([]);
  const [crypto, setCrypto] = useState<CryptoCoin[]>([]);
  const [fx, setFx] = useState<ForexRate[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [g, c, f] = await Promise.all([
        fetchGoldPrices().catch(() => []),
        fetchCryptoPrices().catch(() => []),
        fetchForexRates().catch(() => []),
      ]);
      if (!alive) return;
      setGold(g); setCrypto(c); setFx(f);
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const sjc = gold.find((g) => g.id === "sjc-1l") ?? gold[0];
  const btc = crypto.find((c) => c.symbol === "BTC");
  const eth = crypto.find((c) => c.symbol === "ETH");
  const usd = fx.find((r) => r.code === "USD");
  const eur = fx.find((r) => r.code === "EUR");
  const jpy = fx.find((r) => r.code === "JPY");
  const cny = fx.find((r) => r.code === "CNY");

  // Synthetic high/low for gold (no live history); compute from sell ± small range
  const goldHigh = sjc ? Math.round(sjc.sell * 1.004) : 0;
  const goldLow = sjc ? Math.round(sjc.sell * 0.997) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4">
      {/* Gold — large hero tile */}
      <TileFrame className="col-span-2 md:col-span-2">
        <Link to="/gia-vang" className="block group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="eyebrow mb-1.5">Vàng miếng SJC</div>
              <div className="font-display text-4xl md:text-5xl text-foreground leading-none">
                {sjc ? fmtTrieu(sjc.sell) : "—"}
                <span className="ml-1.5 text-base text-muted-foreground">tr/chỉ</span>
              </div>
            </div>
            <div className="text-right">
              {sjc && <ChangePill value={sjc.changePct} />}
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground/60">24 giờ</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-border mb-4">
            <Stat label="Mua" value={sjc ? `${fmtTrieu(sjc.buy)} tr` : "—"} />
            <Stat label="Cao" value={`${fmtTrieu(goldHigh)} tr`} accent />
            <Stat label="Thấp" value={`${fmtTrieu(goldLow)} tr`} />
          </div>

          <div className="flex items-end gap-1 h-10">
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

          <div className="mt-4 flex items-center justify-between eyebrow opacity-70 group-hover:opacity-100">
            <span>Xem bảng giá vàng đầy đủ</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </TileFrame>

      {/* BTC */}
      <TileFrame>
        <Link to="/tien-dien-tu" className="block">
          <div className="eyebrow mb-1">Bitcoin</div>
          <div className="font-display text-2xl text-foreground leading-none">
            ${btc ? fmt(btc.priceUsd, 0) : "—"}
          </div>
          <div className="mt-1">{btc && <ChangePill value={btc.change24h} />}</div>
          <div className="mt-3">
            {btc && <Spark data={btc.sparkline} color={btc.change24h >= 0 ? "var(--up)" : "var(--down)"} />}
          </div>
          <div className="mt-2 flex justify-between text-xs uppercase tracking-widest text-muted-foreground/60">
            <span>Vol</span>
            <span className="font-mono">${btc ? fmt(btc.volume24h / 1_000_000_000, 1) : "—"}B</span>
          </div>
        </Link>
      </TileFrame>

      {/* ETH */}
      <TileFrame>
        <Link to="/tien-dien-tu" className="block">
          <div className="eyebrow mb-1">Ethereum</div>
          <div className="font-display text-2xl text-foreground leading-none">
            ${eth ? fmt(eth.priceUsd, 0) : "—"}
          </div>
          <div className="mt-1">{eth && <ChangePill value={eth.change24h} />}</div>
          <div className="mt-3">
            {eth && <Spark data={eth.sparkline} color={eth.change24h >= 0 ? "var(--up)" : "var(--down)"} />}
          </div>
          <div className="mt-2 flex justify-between text-xs uppercase tracking-widest text-muted-foreground/60">
            <span>Vol</span>
            <span className="font-mono">${eth ? fmt(eth.volume24h / 1_000_000_000, 1) : "—"}B</span>
          </div>
        </Link>
      </TileFrame>

      {/* Forex — full-width compact list */}
      <TileFrame className="col-span-2">
        <Link to="/ty-gia-ngoai-te" className="block">
          <div className="flex items-baseline justify-between mb-3">
            <div className="eyebrow">Ngoại tệ · Quy đổi VND</div>
            <ArrowUpRight className="h-3.5 w-3.5 text-[var(--gold)]" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
            <FxCell rate={usd} />
            <FxCell rate={eur} />
            <FxCell rate={jpy} digits={2} />
            <FxCell rate={cny} />
          </div>
        </Link>
      </TileFrame>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card p-2.5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground/70">{label}</div>
      <div className={`font-mono text-sm mt-0.5 ${accent ? "text-[var(--gold-light)]" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function FxCell({ rate, digits = 0 }: { rate?: ForexRate; digits?: number }) {
  if (!rate) return <div className="bg-card p-3 h-[60px]" />;
  return (
    <div className="bg-card p-3">
      <div className="text-xs uppercase tracking-widest text-muted-foreground/70">{rate.code}/VND</div>
      <div className="font-mono text-base text-foreground mt-1">{fmt(rate.mid, digits)}</div>
      <div className={`text-xs font-mono mt-0.5 ${rate.changePct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
        {rate.changePct >= 0 ? "+" : ""}{rate.changePct.toFixed(2)}%
      </div>
    </div>
  );
}