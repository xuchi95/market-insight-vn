import { useEffect, useState } from "react";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";

async function fetchXau(): Promise<{ price: number; changePct: number } | null> {
  try {
    const res = await fetch("/api/public/xau", { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const j = await res.json();
    if (typeof j?.price !== "number") return null;
    return { price: j.price, changePct: Number(j.changePct) || 0 };
  } catch {
    return null;
  }
}

interface Tick {
  label: string;
  value: string;
  changePct: number;
}

function fmt(n: number, digits = 0) {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function Ticker() {
  const [ticks, setTicks] = useState<Tick[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [gold, crypto, fx, xau] = await Promise.all([
        fetchGoldPrices().catch(() => []),
        fetchCryptoPrices().catch(() => []),
        fetchForexRates().catch(() => []),
        fetchXau(),
      ]);
      if (!alive) return;
      const sjc = gold.find((g) => g.id === "sjc-1l") ?? gold[0];
      const btc = crypto.find((c) => c.symbol === "BTC");
      const eth = crypto.find((c) => c.symbol === "ETH");
      const usd = fx.find((r) => r.code === "USD");
      const eur = fx.find((r) => r.code === "EUR");
      const jpy = fx.find((r) => r.code === "JPY");
      const cny = fx.find((r) => r.code === "CNY");
      const list: Tick[] = [];
      if (sjc) list.push({ label: "SJC", value: `${fmt(sjc.sell / 1000)}K`, changePct: sjc.changePct });
      if (xau) list.push({ label: "XAU/USD", value: `$${fmt(xau.price, 0)}`, changePct: xau.changePct });
      if (btc) list.push({ label: "BTC", value: `$${fmt(btc.priceUsd, 0)}`, changePct: btc.change24h });
      if (eth) list.push({ label: "ETH", value: `$${fmt(eth.priceUsd, 0)}`, changePct: eth.change24h });
      if (usd) list.push({ label: "USD/VND", value: fmt(usd.mid), changePct: usd.changePct });
      if (eur) list.push({ label: "EUR/VND", value: fmt(eur.mid), changePct: eur.changePct });
      if (jpy) list.push({ label: "JPY/VND", value: fmt(jpy.mid, 2), changePct: jpy.changePct });
      if (cny) list.push({ label: "CNY/VND", value: fmt(cny.mid), changePct: cny.changePct });
      setTicks(list);
    }
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (ticks.length === 0) return <div className="h-9 border-y border-border bg-card/40" />;

  const Row = () => (
    <div className="flex shrink-0 gap-10 px-5 text-[11px] font-medium tracking-[0.18em] uppercase">
      {ticks.map((t, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-foreground/90">{t.label}</span>
          <span className="font-mono text-[var(--gold-light)]">{t.value}</span>
          <span className={t.changePct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}>
            {t.changePct >= 0 ? "+" : ""}{t.changePct.toFixed(2)}%
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden border-y border-border bg-card/60 py-2.5">
      <div className="animate-marquee whitespace-nowrap">
        <Row />
        <Row />
      </div>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}