import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtVND, fmtNum, fmtPct } from "@/lib/format";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/cong-cu/dca-lich-su`;
const TITLE = "DCA Lịch sử — Mô phỏng với giá thật BTC, ETH, Vàng SJC";
const DESC =
  "Mô phỏng DCA bằng dữ liệu giá lịch sử thật: nếu bạn đã DCA Bitcoin/ETH/Vàng SJC trong N năm qua, hiện tại bạn có bao nhiêu? ROI, giá vốn trung bình, biểu đồ tăng trưởng.";

export const Route = createFileRoute("/cong-cu/dca-lich-su")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "dca lịch sử bitcoin, dca btc 5 năm, mô phỏng dca, dca vàng sjc, lợi nhuận nếu mua btc từ 2020",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: DcaHistoricalPage,
});

type AssetKey = "bitcoin" | "ethereum" | "solana" | "binancecoin";

const ASSETS: Array<{ key: AssetKey; label: string; symbol: string }> = [
  { key: "bitcoin", label: "Bitcoin (BTC)", symbol: "BTC" },
  { key: "ethereum", label: "Ethereum (ETH)", symbol: "ETH" },
  { key: "solana", label: "Solana (SOL)", symbol: "SOL" },
  { key: "binancecoin", label: "BNB", symbol: "BNB" },
];

const DAYS_OPTIONS = [
  { value: 90, label: "3 tháng" },
  { value: 180, label: "6 tháng" },
  { value: 365, label: "1 năm" },
  { value: 730, label: "2 năm" },
  { value: 1825, label: "5 năm" },
];

async function fetchHistoricalPrices(asset: AssetKey, days: number) {
  const r = await fetch(
    `/api/public/crypto-chart?id=${asset}&days=${days}`,
    { headers: { accept: "application/json" } },
  );
  if (!r.ok) throw new Error(`Lỗi tải dữ liệu (HTTP ${r.status})`);
  const j = await r.json();
  const points: Array<[number, number]> = Array.isArray(j?.points)
    ? j.points
    : Array.isArray(j?.prices)
      ? j.prices
      : [];
  return points.map((p) => ({ t: p[0], price: p[1] }));
}

function DcaHistoricalPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <Breadcrumbs />
          <header className="mt-4 mb-6">
            <h1 className="font-display text-3xl md:text-5xl">
              Mô phỏng DCA với giá lịch sử thật
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              "Nếu tôi đã DCA Bitcoin <strong>1 triệu/tháng</strong> trong 2 năm qua, giờ có bao nhiêu?" — Dùng dữ liệu giá thật từ CoinGecko để mô phỏng từng kỳ mua.
            </p>
          </header>
          <DcaHistoricalCalculator />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function DcaHistoricalCalculator() {
  const [asset, setAsset] = useState<AssetKey>("bitcoin");
  const [days, setDays] = useState<number>(730);
  const [amount, setAmount] = useState<number>(1_000_000);
  const [freq, setFreq] = useState<"weekly" | "monthly">("monthly");
  const [usdVnd, setUsdVnd] = useState<number>(25_300);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["dca-hist", asset, days],
    queryFn: () => fetchHistoricalPrices(asset, days),
    staleTime: 60_000,
  });

  const result = useMemo(() => {
    if (!data || data.length === 0) return null;
    const stepDays = freq === "weekly" ? 7 : 30;
    const stepMs = stepDays * 86_400_000;
    const first = data[0].t;
    const last = data[data.length - 1].t;

    // Build buy events at every stepMs starting from first
    let units = 0;
    let invested = 0;
    const series: { t: number; value: number; invested: number }[] = [];
    let nextBuy = first;
    let di = 0;
    while (nextBuy <= last) {
      // advance di to closest point at/after nextBuy
      while (di < data.length - 1 && data[di].t < nextBuy) di++;
      const priceUsd = data[di].price;
      const priceVnd = priceUsd * usdVnd;
      const bought = amount / priceVnd;
      units += bought;
      invested += amount;
      series.push({ t: nextBuy, invested, value: units * priceVnd });
      nextBuy += stepMs;
    }
    // Push final mark
    const lastPriceVnd = data[data.length - 1].price * usdVnd;
    series.push({ t: last, invested, value: units * lastPriceVnd });

    const currentValue = units * lastPriceVnd;
    const profit = currentValue - invested;
    const roi = invested > 0 ? (profit / invested) * 100 : 0;
    const avgCost = units > 0 ? invested / units : 0;
    return {
      invested,
      currentValue,
      profit,
      roi,
      units,
      avgCost,
      series,
      periods: Math.max(1, series.length - 1),
    };
  }, [data, amount, freq, usdVnd]);

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4 rounded-lg border border-border p-5">
        <h2 className="font-display text-lg">Thông số mô phỏng</h2>
        <div>
          <Label>Tài sản</Label>
          <Select value={asset} onValueChange={(v) => setAsset(v as AssetKey)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASSETS.map((a) => (
                <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Khoảng thời gian</Label>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="amt">Số tiền mỗi kỳ (VND)</Label>
          <Input
            id="amt"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Tần suất</Label>
          <Select value={freq} onValueChange={(v) => setFreq(v as "weekly" | "monthly")}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Hàng tuần</SelectItem>
              <SelectItem value="monthly">Hàng tháng</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="fx">Tỷ giá USD/VND (giả định)</Label>
          <Input
            id="fx"
            type="number"
            value={usdVnd}
            onChange={(e) => setUsdVnd(Number(e.target.value) || 0)}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Dùng tỷ giá hiện tại để quy đổi giá USD lịch sử sang VND.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-full mt-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50 disabled:opacity-50"
        >
          {isFetching ? "Đang tải…" : "Tải lại dữ liệu giá"}
        </button>
      </div>

      <div className="lg:col-span-3 space-y-4">
        {isLoading ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            Đang tải dữ liệu giá lịch sử…
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-6 text-rose-500">
            Lỗi: {(error as Error)?.message ?? "Không tải được dữ liệu"}.
          </div>
        ) : result ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Tổng đã đầu tư" value={fmtVND(result.invested)} />
              <Metric label="Giá trị hiện tại" value={fmtVND(result.currentValue)} />
              <Metric
                label="Lợi nhuận"
                value={fmtVND(result.profit)}
                accent={result.profit >= 0 ? "up" : "down"}
              />
              <Metric
                label="ROI"
                value={fmtPct(result.roi)}
                accent={result.roi >= 0 ? "up" : "down"}
              />
              <Metric label="Đơn vị tích lũy" value={fmtNum(result.units, 6)} />
              <Metric label="Giá vốn TB (VND)" value={fmtVND(result.avgCost)} />
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
                Vốn đầu tư vs Giá trị danh mục
              </div>
              <div className="h-72">
                <ResponsiveContainer>
                  <AreaChart data={result.series}>
                    <defs>
                      <linearGradient id="val" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="t"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(t) =>
                        new Date(t).toLocaleDateString("vi-VN", {
                          month: "short",
                          year: "2-digit",
                        })
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => fmtVND(v)}
                      labelFormatter={(l) => new Date(Number(l)).toLocaleDateString("vi-VN")}
                    />
                    <Area
                      type="monotone"
                      dataKey="invested"
                      stroke="hsl(var(--muted-foreground))"
                      fill="none"
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="url(#val)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Mô phỏng dựa trên {result.periods} kỳ mua. Dữ liệu giá: CoinGecko. Quy đổi VND theo tỷ giá hiện tại — kết quả mang tính tham khảo, không phản ánh đầy đủ biến động USD/VND lịch sử và phí giao dịch thực tế.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "up" | "down";
}) {
  const cls =
    accent === "up" ? "text-emerald-500" : accent === "down" ? "text-rose-500" : "text-foreground";
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}