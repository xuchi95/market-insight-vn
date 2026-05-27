import { Activity, Bitcoin, DollarSign } from "lucide-react";
import { ChangeBadge } from "./ChangeBadge";
import { fmtVND, fmtUSD, fmtTrieu } from "@/lib/format";
import { usePriceFlash } from "@/hooks/usePriceFlash";
import { cn } from "@/lib/utils";

interface Props {
  goldSjc?: { sell: number; changePct: number };
  btc?: { priceUsd: number; change24h: number };
  usd?: { sell: number; changePct: number };
}

function StatCard({ icon, label, value, change, accent, flashKey }: {
  icon: React.ReactNode; label: string; value: string; change?: number; accent: string; flashKey: number;
}) {
  const flash = usePriceFlash(flashKey);
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-lg", flash)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("grid h-10 w-10 place-items-center rounded-xl", accent)}>{icon}</div>
          <div className="text-sm text-muted-foreground font-medium">{label}</div>
        </div>
        {change !== undefined && <ChangeBadge value={change} />}
      </div>
      <div className="mt-4 text-3xl font-bold tabular tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">Cập nhật realtime</div>
    </div>
  );
}

export function Hero({ goldSjc, btc, usd }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="container relative mx-auto px-4 py-12 lg:py-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold mb-5">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--up)] opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--up)]" /></span>
            Đang cập nhật realtime
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Theo dõi giá <span className="text-gold">vàng</span>, <span className="text-gold">crypto</span> và <span className="text-gold">tỷ giá ngoại tệ</span> realtime
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            Cập nhật liên tục giá SJC, DOJI, BTC, ETH, USDT, USD, CNY và nhiều tài sản khác — dashboard tài chính chuyên nghiệp ngay trên trình duyệt.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<Activity className="h-5 w-5 text-gold-foreground" />}
            accent="bg-gold-gradient"
            label="Vàng SJC (bán)"
            value={goldSjc ? `${fmtTrieu(goldSjc.sell)} tr/chỉ` : "—"}
            change={goldSjc?.changePct}
            flashKey={goldSjc?.sell ?? 0}
          />
          <StatCard
            icon={<Bitcoin className="h-5 w-5 text-white" />}
            accent="bg-[oklch(0.65_0.2_50)]"
            label="Bitcoin (BTC)"
            value={btc ? fmtUSD(btc.priceUsd, 0) : "—"}
            change={btc?.change24h}
            flashKey={btc?.priceUsd ?? 0}
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5 text-white" />}
            accent="bg-[oklch(0.5_0.18_250)]"
            label="USD / VND"
            value={usd ? fmtVND(usd.sell) : "—"}
            change={usd?.changePct}
            flashKey={usd?.sell ?? 0}
          />
        </div>
      </div>
    </section>
  );
}