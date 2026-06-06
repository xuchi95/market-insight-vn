import { useCallback, useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import { fmtTrieu } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
  href: string;
}

function fmt(n: number, digits = 0) {
  return n.toLocaleString("vi-VN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function fmtCompact(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return fmt(n);
}

export function Ticker() {
  // Đồng hồ độc lập đặt ở đầu thanh ticker — tách khỏi header để gọn gàng.
  const [now, setNow] = useState<Date | null>(null);
  const [tz, setTz] = useState<"VN" | "UTC">(() => {
    if (typeof window === "undefined") return "VN";
    return (localStorage.getItem("mw:clock-tz") as "VN" | "UTC") || "VN";
  });
  const { user } = useAuth();
  // Khi đăng nhập: nạp lựa chọn múi giờ từ hồ sơ để đồng bộ giữa thiết bị.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    supabase
      .from("profiles")
      .select("clock_timezone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const remote = (data?.clock_timezone as "VN" | "UTC" | undefined);
        if (remote === "VN" || remote === "UTC") setTz(remote);
      });
    return () => { alive = false; };
  }, [user]);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    try { localStorage.setItem("mw:clock-tz", tz); } catch { /* ignore */ }
    // Đồng bộ lên hồ sơ tài khoản khi đã đăng nhập (fire-and-forget).
    if (user) {
      supabase.from("profiles").update({ clock_timezone: tz }).eq("id", user.id).then(() => {});
    }
  }, [tz, user]);
  const timeStr = now
    ? now.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz === "VN" ? "Asia/Ho_Chi_Minh" : "UTC",
      })
    : "";
  // Mỗi nguồn dữ liệu được lưu riêng để render tăng dần — không phải chờ
  // nguồn chậm nhất (giá vàng cold-start có thể mất 5–7s) thì mới hiện ticker.
  type GoldArr = Awaited<ReturnType<typeof fetchGoldPrices>>;
  type CryptoArr = Awaited<ReturnType<typeof fetchCryptoPrices>>;
  type FxArr = Awaited<ReturnType<typeof fetchForexRates>>;
  const [gold, setGold] = useState<GoldArr>([]);
  const [crypto, setCrypto] = useState<CryptoArr>([]);
  const [fx, setFx] = useState<FxArr>([]);
  const [xau, setXau] = useState<{ price: number; changePct: number } | null>(null);

  const loadAll = useCallback((alive: () => boolean) => {
    // Fire & forget từng nguồn — cái nào về trước cập nhật trước.
    fetchGoldPrices().then((v) => alive() && setGold(v)).catch(() => {});
    fetchCryptoPrices().then((v) => alive() && setCrypto(v)).catch(() => {});
    fetchForexRates().then((v) => alive() && setFx(v)).catch(() => {});
    fetchXau().then((v) => alive() && setXau(v)).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    const isAlive = () => mounted;
    loadAll(isAlive);
    const t = setInterval(() => loadAll(isAlive), 30_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [loadAll]);

  const ticks: Tick[] = (() => {
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
          href: "/tai-san/gold-sjc-1l",
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
          href: "/tai-san/gold-xauusd",
          details: [
            { label: "Giá", value: `$${fmt(xau.price, 0)}` },
            {
              label: "Thay đổi 24h",
              value: `${xau.changePct >= 0 ? "+" : ""}${xau.changePct.toFixed(2)}%`,
            },
          ],
        });
      }

      if (btc) {
        list.push({
          label: "BTC",
          value: `$${fmt(btc.priceUsd, 0)}`,
          changePct: btc.change24h,
          href: "/tai-san/BTC",
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
          href: "/tai-san/ETH",
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
          href: "/tai-san/usd",
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
          href: "/tai-san/eur",
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
          href: "/tai-san/jpy",
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
          href: "/tai-san/cny",
          details: [
            { label: "Tên", value: cny.name },
            { label: "Mua", value: fmt(cny.buy) },
            { label: "Bán", value: fmt(cny.sell) },
            { label: "Giữa", value: fmt(cny.mid) },
          ],
        });
      }

      return list;
  })();

  if (ticks.length === 0) return <div className="h-9 border-y border-border bg-card/40" />;

  const Row = () => (
    <div className="flex shrink-0 gap-10 px-5 text-xs font-medium tracking-[0.14em] uppercase">
      {ticks.map((t, i) => (
        <Link
          key={i}
          to={t.href}
          className="flex cursor-pointer items-center gap-2 select-none rounded-sm transition-colors hover:text-foreground"
        >
          <span className="text-foreground/90">{t.label}</span>
          <span className="tabular text-[var(--gold-light)]">{t.value}</span>
          <span className={t.changePct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}>
            {t.changePct >= 0 ? "+" : ""}
            {t.changePct.toFixed(2)}%
          </span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="ticker-marquee group relative flex items-stretch overflow-hidden border-y border-border bg-card/60">
        {/* Đồng hồ độc lập — không cuộn cùng marquee */}
        <div
          className="relative z-10 flex shrink-0 items-center gap-2 border-r border-border bg-card/80 px-3 py-2.5 text-[11px] font-medium tabular text-muted-foreground"
        >
          <Clock className="h-3 w-3 text-[var(--gold)]/80" aria-hidden />
          <span className="min-w-[2.6rem] tracking-wider">{timeStr || "--:--"}</span>
          <div className="flex items-center rounded-sm border border-border/70 bg-background/40 p-0.5" role="group">
            {(["VN", "UTC"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setTz(opt)}
                aria-pressed={tz === opt}
                className={
                  "rounded-[2px] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider transition-colors " +
                  (tz === opt
                    ? "bg-[var(--gold)]/20 text-[var(--gold)]"
                    : "text-muted-foreground/70 hover:text-foreground")
                }
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden py-2.5">
          <div className="animate-marquee whitespace-nowrap">
            <Row />
            <Row />
          </div>
          {/* edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
        </div>
    </div>
  );
}
