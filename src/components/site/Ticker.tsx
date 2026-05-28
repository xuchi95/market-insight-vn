import { useEffect, useState } from "react";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import { fmtTrieu } from "@/lib/format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface DetailLine {
  label: string;
  value: string;
}

interface Tick {
  label: string;
  value: string;
  changePct: number;
  details: DetailLine[];
}

function fmt(n: number, digits = 0) {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtCompact(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return fmt(n);
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

      if (sjc) {
        list.push({
          label: "SJC",
          value: `${fmtTrieu(sjc.sell)} tr`,
          changePct: sjc.changePct,
          details: [
            { label: "Giá mua", value: `${fmtTrieu(sjc.buy)} tr` },
            { label: "Giá bán", value: `${fmtTrieu(sjc.sell)} tr` },
            { label: "Chênh lệch", value: `${fmtTrieu(sjc.sell - sjc.buy)} tr` },
          ],
        });
      }

      if (xau) {
        list.push({
          label: "XAU/USD",
          value: `$${fmt(xau.price, 0)}`,
          changePct: xau.changePct,
          details: [
            { label: "Giá", value: `$${fmt(xau.price, 0)}` },
            { label: "Thay đổi 24h", value: `${xau.changePct >= 0 ? "+" : ""}${xau.changePct.toFixed(2)}%` },
          ],
        });
      }

      if (btc) {
        list.push({
          label: "BTC",
          value: `$${fmt(btc.priceUsd, 0)}`,
          changePct: btc.change24h,
          details: [
            { label: "Giá USD", value: `$${fmt(btc.priceUsd, 0)}` },
            { label: "Giá VND", value: `${fmtTrieu(btc.priceVnd)} tr` },
            { label: "Vốn hóa", value: `$${fmtCompact(btc.marketCap)}` },
            { label: "KL 24h", value: `$${fmtCompact(btc.volume24h)}` },
          ],
        });
      }

      if (eth) {
        list.push({
          label: "ETH",
          value: `$${fmt(eth.priceUsd, 0)}`,
          changePct: eth.change24h,
          details: [
            { label: "Giá USD", value: `$${fmt(eth.priceUsd, 0)}` },
            { label: "Giá VND", value: `${fmtTrieu(eth.priceVnd)} tr` },
            { label: "Vốn hóa", value: `$${fmtCompact(eth.marketCap)}` },
            { label: "KL 24h", value: `$${fmtCompact(eth.volume24h)}` },
          ],
        });
      }

      if (usd) {
        list.push({
          label: "USD/VND",
          value: fmt(usd.mid),
          changePct: usd.changePct,
          details: [
            { label: "Tên", value: usd.name },
            { label: "Mua", value: fmt(usd.buy) },
            { label: "Bán", value: fmt(usd.sell) },
            { label: "Giữa", value: fmt(usd.mid) },
          ],
        });
      }

      if (eur) {
        list.push({
          label: "EUR/VND",
          value: fmt(eur.mid),
          changePct: eur.changePct,
          details: [
            { label: "Tên", value: eur.name },
            { label: "Mua", value: fmt(eur.buy) },
            { label: "Bán", value: fmt(eur.sell) },
            { label: "Giữa", value: fmt(eur.mid) },
          ],
        });
      }

      if (jpy) {
        list.push({
          label: "JPY/VND",
          value: fmt(jpy.mid, 2),
          changePct: jpy.changePct,
          details: [
            { label: "Tên", value: jpy.name },
            { label: "Mua", value: fmt(jpy.buy, 2) },
            { label: "Bán", value: fmt(jpy.sell, 2) },
            { label: "Giữa", value: fmt(jpy.mid, 2) },
          ],
        });
      }

      if (cny) {
        list.push({
          label: "CNY/VND",
          value: fmt(cny.mid),
          changePct: cny.changePct,
          details: [
            { label: "Tên", value: cny.name },
            { label: "Mua", value: fmt(cny.buy) },
            { label: "Bán", value: fmt(cny.sell) },
            { label: "Giữa", value: fmt(cny.mid) },
          ],
        });
      }

      setTicks(list);
    }
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (ticks.length === 0) return <div className="h-9 border-y border-border bg-card/40" />;

  const Row = () => (
    <div className="flex shrink-0 gap-10 px-5 text-xs font-medium tracking-[0.14em] uppercase">
      {ticks.map((t, i) => (
        <Tooltip key={i}>
          <TooltipTrigger asChild>
            <span className="flex cursor-default items-center gap-2 select-none">
              <span className="text-foreground/90">{t.label}</span>
              <span className="font-mono text-[var(--gold-light)]">{t.value}</span>
              <span className={t.changePct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}>
                {t.changePct >= 0 ? "+" : ""}{t.changePct.toFixed(2)}%
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-56 border border-border bg-popover p-0 shadow-lg">
            <div className="px-3 py-2 border-b border-border bg-muted/50">
              <span className="text-xs font-semibold text-foreground">{t.label}</span>
            </div>
            <div className="px-3 py-2 space-y-1">
              {t.details.map((d, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-mono text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="group relative overflow-hidden border-y border-border bg-card/60 py-2.5">
        <div className="animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused]">
          <Row />
          <Row />
        </div>
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
      </div>
    </TooltipProvider>
  );
}
