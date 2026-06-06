import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtVND, fmtNum, fmtPct } from "@/lib/format";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/cong-cu/dca-roi`;
const TITLE = "Máy tính DCA & ROI — Tính lợi nhuận đầu tư BTC, vàng, chứng khoán";
const DESC = "Công cụ tính DCA (Dollar-Cost Averaging) và ROI cho Bitcoin, vàng SJC, cổ phiếu: ước lượng tổng vốn, giá trị hiện tại, lợi nhuận và % lãi/lỗ theo thời gian.";

export const Route = createFileRoute("/cong-cu/dca-roi")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "máy tính dca, dca bitcoin, dca vàng, công cụ tính roi, tính lợi nhuận đầu tư crypto" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE + "/" },
            { "@type": "ListItem", position: 2, name: "Công cụ", item: SITE + "/cong-cu/dca-roi" },
            { "@type": "ListItem", position: 3, name: "DCA & ROI", item: URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Máy tính DCA & ROI — MarketWatch",
          url: URL,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          inLanguage: "vi-VN",
          description: DESC,
          offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
        }),
      },
    ],
  }),
  component: DcaRoiPage,
});

function DcaRoiPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <Breadcrumbs />
          <header className="mt-4 mb-8">
            <h1 className="font-display text-3xl md:text-5xl">Máy tính DCA &amp; ROI</h1>
          </header>

          <Tabs defaultValue="dca">
            <TabsList className="mb-6">
              <TabsTrigger value="dca">DCA Calculator</TabsTrigger>
              <TabsTrigger value="roi">ROI Calculator</TabsTrigger>
            </TabsList>
            <TabsContent value="dca"><DcaCalculator /></TabsContent>
            <TabsContent value="roi"><RoiCalculator /></TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- DCA ---------------- */
function DcaCalculator() {
  const [amount, setAmount] = useState(2_000_000);
  const [freq, setFreq] = useState<"weekly" | "monthly">("monthly");
  const [periods, setPeriods] = useState(24);
  const [startPrice, setStartPrice] = useState(50_000_000);
  const [endPrice, setEndPrice] = useState(80_000_000);

  const result = useMemo(() => {
    const totalInvested = amount * periods;
    let units = 0;
    const series: { period: number; value: number; invested: number }[] = [];
    for (let i = 1; i <= periods; i++) {
      const t = (i - 1) / Math.max(1, periods - 1);
      const price = startPrice + (endPrice - startPrice) * t;
      const bought = amount / price;
      units += bought;
      const invested = amount * i;
      const value = units * price;
      series.push({ period: i, value: Math.round(value), invested });
    }
    const currentValue = units * endPrice;
    const profit = currentValue - totalInvested;
    const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    const avgCost = units > 0 ? totalInvested / units : 0;
    return { totalInvested, units, currentValue, profit, roi, avgCost, series };
  }, [amount, periods, startPrice, endPrice]);

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4 rounded-lg border border-border p-5">
        <h2 className="font-display text-lg">Thông số DCA</h2>
        <div>
          <Label htmlFor="amount">Số tiền đầu tư mỗi kỳ (VND)</Label>
          <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="mt-1" />
        </div>
        <div>
          <Label>Tần suất</Label>
          <Select value={freq} onValueChange={(v) => setFreq(v as any)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Hàng tuần</SelectItem>
              <SelectItem value="monthly">Hàng tháng</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="periods">Số kỳ ({freq === "weekly" ? "tuần" : "tháng"})</Label>
          <Input id="periods" type="number" value={periods} onChange={(e) => setPeriods(Math.max(1, Number(e.target.value) || 1))} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="startPrice">Giá tại kỳ đầu (VND/đơn vị)</Label>
          <Input id="startPrice" type="number" value={startPrice} onChange={(e) => setStartPrice(Number(e.target.value) || 0)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="endPrice">Giá hiện tại (VND/đơn vị)</Label>
          <Input id="endPrice" type="number" value={endPrice} onChange={(e) => setEndPrice(Number(e.target.value) || 0)} className="mt-1" />
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Metric label="Tổng vốn" value={fmtVND(result.totalInvested)} />
          <Metric label="Giá trị hiện tại" value={fmtVND(result.currentValue)} />
          <Metric label="Lợi nhuận" value={fmtVND(result.profit)} accent={result.profit >= 0 ? "up" : "down"} />
          <Metric label="ROI" value={fmtPct(result.roi)} accent={result.roi >= 0 ? "up" : "down"} />
          <Metric label="Số đơn vị tích lũy" value={fmtNum(result.units, 6)} />
          <Metric label="Giá vốn trung bình" value={fmtVND(result.avgCost)} />
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">Tăng trưởng theo kỳ</div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={result.series}>
                <defs>
                  <linearGradient id="dca-value" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: number) => fmtVND(v)}
                  labelFormatter={(l) => `Kỳ ${l}`}
                />
                <Area type="monotone" dataKey="invested" stroke="hsl(var(--muted-foreground))" fill="none" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#dca-value)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ROI ---------------- */
function RoiCalculator() {
  const [buy, setBuy] = useState(50_000_000);
  const [sell, setSell] = useState(75_000_000);
  const [qty, setQty] = useState(1);
  const [feePct, setFeePct] = useState(0.5);
  const [days, setDays] = useState(365);

  const result = useMemo(() => {
    const cost = buy * qty;
    const gross = sell * qty;
    const fee = (cost + gross) * (feePct / 100);
    const net = gross - cost - fee;
    const roi = cost > 0 ? (net / cost) * 100 : 0;
    const annualized = days > 0 && cost > 0 ? (Math.pow(1 + net / cost, 365 / days) - 1) * 100 : 0;
    return { cost, gross, fee, net, roi, annualized };
  }, [buy, sell, qty, feePct, days]);

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4 rounded-lg border border-border p-5">
        <h2 className="font-display text-lg">Giao dịch của bạn</h2>
        <div>
          <Label htmlFor="buy">Giá mua (VND/đơn vị)</Label>
          <Input id="buy" type="number" value={buy} onChange={(e) => setBuy(Number(e.target.value) || 0)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="sell">Giá bán (VND/đơn vị)</Label>
          <Input id="sell" type="number" value={sell} onChange={(e) => setSell(Number(e.target.value) || 0)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="qty">Số lượng</Label>
          <Input id="qty" type="number" step="any" value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="fee">Phí giao dịch (% trên tổng)</Label>
          <Input id="fee" type="number" step="0.01" value={feePct} onChange={(e) => setFeePct(Number(e.target.value) || 0)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="days">Thời gian nắm giữ (ngày)</Label>
          <Input id="days" type="number" value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} className="mt-1" />
        </div>
      </div>

      <div className="lg:col-span-3 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Metric label="Tổng chi" value={fmtVND(result.cost)} />
          <Metric label="Tổng thu" value={fmtVND(result.gross)} />
          <Metric label="Phí" value={fmtVND(result.fee)} />
          <Metric label="Lợi nhuận ròng" value={fmtVND(result.net)} accent={result.net >= 0 ? "up" : "down"} />
          <Metric label="ROI" value={fmtPct(result.roi)} accent={result.roi >= 0 ? "up" : "down"} />
          <Metric label="ROI/năm" value={fmtPct(result.annualized)} accent={result.annualized >= 0 ? "up" : "down"} />
        </div>
        <p className="text-xs text-muted-foreground">
          ROI/năm (annualized) quy đổi lợi nhuận của khoảng nắm giữ về tỉ suất tương đương 1 năm để so sánh các khoản đầu tư có thời gian khác nhau.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: "up" | "down" }) {
  const cls = accent === "up" ? "text-emerald-500" : accent === "down" ? "text-rose-500" : "text-foreground";
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}