import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { listTransactions, addTransaction, deleteTransaction } from "@/lib/portfolio.functions";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fmtVND, fmtNum, fmtPct } from "@/lib/format";
import { Plus, Trash2, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/portfolio`;
const TITLE = "Danh mục đầu tư — Theo dõi tài sản crypto & vàng realtime";
const DESC = "Quản lý danh mục đầu tư cá nhân: theo dõi tổng giá trị, lợi nhuận lãi/lỗ realtime của Bitcoin, Ethereum, vàng SJC và các tài sản khác.";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PortfolioPage,
});

type Tx = {
  id: string;
  asset_type: "crypto" | "gold";
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price_vnd: number | null;
  price_usd: number | null;
  fee_vnd: number;
  executed_at: string;
  note: string | null;
};

type Position = {
  asset_type: "crypto" | "gold";
  symbol: string;
  quantity: number;       // số lượng còn lại
  avgCostVnd: number;     // giá vốn trung bình/đơn vị
  costVnd: number;        // tổng vốn còn nằm trong vị thế = qty * avgCost
  realizedPlVnd: number;  // lãi/lỗ đã thực hiện
  totalFeeVnd: number;
  buyCount: number;
  sellCount: number;
};

const CRYPTO_OPTIONS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "the-open-network", symbol: "TON", name: "Toncoin" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
];

const GOLD_OPTIONS = [
  { id: "sjc-1l", name: "SJC 1 lượng" },
  { id: "btmc-vrtl", name: "BTMC Rồng Thăng Long" },
  { id: "btmc-nhan", name: "BTMC Nhẫn 9999" },
  { id: "doji", name: "DOJI 9999" },
  { id: "pnj", name: "PNJ 9999" },
  { id: "phuquy", name: "Phú Quý 9999" },
  { id: "xauusd", name: "XAU/USD (oz)" },
];

function PortfolioPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/dang-nhap" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Đang kiểm tra đăng nhập…
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <Breadcrumbs />
          <PortfolioContent />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PortfolioContent() {
  const qc = useQueryClient();
  const list = useServerFn(listTransactions);
  const remove = useServerFn(deleteTransaction);

  const txQ = useQuery({
    queryKey: ["portfolio-transactions"],
    queryFn: () => list(),
  });

  const cryptoQ = useQuery({
    queryKey: ["crypto-prices"],
    queryFn: () => fetchCryptoPrices(),
    refetchInterval: 30_000,
  });

  const goldQ = useQuery({
    queryKey: ["gold-prices"],
    queryFn: () => fetchGoldPrices(),
    refetchInterval: 30_000,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio-transactions"] }),
  });

  const transactions: Tx[] = (txQ.data?.items ?? []) as Tx[];

  // Quy đổi USD/VND xấp xỉ cho giá nhập bằng USD
  const usdVnd = 25_400;

  // Tính các vị thế hiện tại bằng phương pháp giá vốn trung bình
  const positions: Position[] = useMemo(() => {
    const byKey = new Map<string, Position>();
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
    );
    for (const t of sorted) {
      const key = `${t.asset_type}:${t.symbol}`;
      const priceVnd = t.price_vnd ?? (t.price_usd != null ? t.price_usd * usdVnd : 0);
      const cur = byKey.get(key) ?? {
        asset_type: t.asset_type, symbol: t.symbol,
        quantity: 0, avgCostVnd: 0, costVnd: 0,
        realizedPlVnd: 0, totalFeeVnd: 0, buyCount: 0, sellCount: 0,
      };
      cur.totalFeeVnd += t.fee_vnd ?? 0;
      if (t.side === "buy") {
        const newQty = cur.quantity + t.quantity;
        const newCost = cur.costVnd + priceVnd * t.quantity + (t.fee_vnd ?? 0);
        cur.quantity = newQty;
        cur.costVnd = newCost;
        cur.avgCostVnd = newQty > 0 ? newCost / newQty : 0;
        cur.buyCount += 1;
      } else {
        const sellQty = Math.min(t.quantity, cur.quantity);
        const proceeds = priceVnd * sellQty - (t.fee_vnd ?? 0);
        const costBasis = cur.avgCostVnd * sellQty;
        cur.realizedPlVnd += proceeds - costBasis;
        cur.quantity -= sellQty;
        cur.costVnd = cur.avgCostVnd * cur.quantity;
        cur.sellCount += 1;
      }
      byKey.set(key, cur);
    }
    return Array.from(byKey.values());
  }, [transactions]);

  const enriched = useMemo(() => {
    return positions.map((p) => {
      let priceVnd = 0;
      if (p.asset_type === "crypto") {
        const coin = (cryptoQ.data ?? []).find((c) => c.id === p.symbol);
        priceVnd = coin?.priceVnd ?? 0;
      } else {
        const g = (goldQ.data ?? []).find((x) => x.id === p.symbol);
        if (g) {
          if (g.unit.includes("USD")) priceVnd = ((g.buy + g.sell) / 2) * usdVnd;
          else priceVnd = (g.buy + g.sell) / 2;
        }
      }
      const currentVnd = priceVnd * p.quantity;
      const unrealizedPl = currentVnd - p.costVnd;
      const unrealizedPlPct = p.costVnd > 0 ? (unrealizedPl / p.costVnd) * 100 : 0;
      return { ...p, priceVnd, currentVnd, unrealizedPl, unrealizedPlPct };
    });
  }, [positions, cryptoQ.data, goldQ.data]);

  const totals = useMemo(() => {
    const current = enriched.reduce((s, h) => s + h.currentVnd, 0);
    const cost = enriched.reduce((s, h) => s + h.costVnd, 0);
    const unrealized = current - cost;
    const unrealizedPct = cost > 0 ? (unrealized / cost) * 100 : 0;
    const realized = enriched.reduce((s, h) => s + h.realizedPlVnd, 0);
    return { current, cost, unrealized, unrealizedPct, realized };
  }, [enriched]);

  const allocation = useMemo(() => {
    return enriched
      .filter((h) => h.currentVnd > 0)
      .map((h) => ({ name: labelFor(h), value: h.currentVnd }));
  }, [enriched]);

  const COLORS = ["#f5b342", "#ef4444", "#3b82f6", "#10b981", "#a855f7", "#f97316", "#06b6d4", "#eab308", "#ec4899", "#84cc16"];

  return (
    <div className="mt-4">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-5xl">Danh mục của tôi</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Ghi lại từng lệnh mua/bán — hệ thống tự tính giá vốn trung bình, số lượng còn lại và lãi/lỗ realtime.
          </p>
        </div>
        <TransactionDialog />
      </header>

      <div className="grid md:grid-cols-5 gap-3 mb-6">
        <Metric label="Tổng giá trị" value={fmtVND(totals.current)} />
        <Metric label="Vốn còn nắm giữ" value={fmtVND(totals.cost)} />
        <Metric label="Lãi/Lỗ chưa chốt" value={fmtVND(totals.unrealized)} accent={totals.unrealized >= 0 ? "up" : "down"} />
        <Metric label="% chưa chốt" value={fmtPct(totals.unrealizedPct)} accent={totals.unrealizedPct >= 0 ? "up" : "down"} />
        <Metric label="Lãi/Lỗ đã chốt" value={fmtVND(totals.realized)} accent={totals.realized >= 0 ? "up" : "down"} />
      </div>

      <PortfolioChart transactions={transactions} totals={totals} />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-lg border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-card text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
            <div className="col-span-3">Tài sản</div>
            <div className="col-span-2 text-right">Số lượng</div>
            <div className="col-span-2 text-right">Giá vốn TB</div>
            <div className="col-span-2 text-right">Giá hiện tại</div>
            <div className="col-span-3 text-right">P/L chưa chốt / đã chốt</div>
          </div>
          {txQ.isLoading && (
            <div className="p-6 text-sm text-muted-foreground text-center">Đang tải…</div>
          )}
          {!txQ.isLoading && enriched.length === 0 && (
            <div className="p-8 text-sm text-muted-foreground text-center">
              Chưa có giao dịch nào. Bấm “Thêm giao dịch” để bắt đầu.
            </div>
          )}
          {enriched.map((h) => (
            <div
              key={`${h.asset_type}:${h.symbol}`}
              className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent/40 transition-colors items-center"
            >
              <div className="md:col-span-3">
                <div className="font-medium text-sm">{labelFor(h)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {h.asset_type} · {h.buyCount} mua / {h.sellCount} bán
                </div>
              </div>
              <div className="md:col-span-2 text-right tabular-nums text-sm">{fmtNum(h.quantity, 8)}</div>
              <div className="md:col-span-2 text-right tabular-nums text-sm">{fmtVND(h.avgCostVnd)}</div>
              <div className="md:col-span-2 text-right tabular-nums text-sm">{fmtVND(h.priceVnd)}</div>
              <div className="md:col-span-3 text-right tabular-nums text-sm">
                <div className={h.unrealizedPl >= 0 ? "text-emerald-500" : "text-rose-500"}>
                  {fmtVND(h.unrealizedPl)} <span className="text-[10px]">({fmtPct(h.unrealizedPlPct)})</span>
                </div>
                <div className={`text-[10px] ${h.realizedPlVnd >= 0 ? "text-emerald-500/80" : "text-rose-500/80"}`}>
                  Đã chốt: {fmtVND(h.realizedPlVnd)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">Phân bổ tài sản</div>
          {allocation.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {allocation.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: number) => fmtVND(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-2 space-y-1">
            {allocation.map((a, i) => (
              <li key={a.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {a.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {((a.value / totals.current) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Lịch sử giao dịch */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lịch sử giao dịch</div>
          <TransactionDialog />
        </div>
        {transactions.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">Chưa có giao dịch.</div>
        ) : (
          [...transactions].reverse().map((t) => {
            const priceVnd = t.price_vnd ?? (t.price_usd != null ? t.price_usd * usdVnd : 0);
            return (
              <div key={t.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border last:border-b-0 items-center text-sm">
                <div className="col-span-2 text-xs text-muted-foreground tabular-nums">
                  {new Date(t.executed_at).toLocaleDateString("vi-VN")}
                </div>
                <div className="col-span-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    t.side === "buy" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  }`}>
                    {t.side === "buy" ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                    {t.side === "buy" ? "Mua" : "Bán"}
                  </span>
                </div>
                <div className="col-span-3 truncate">{labelFor(t)}</div>
                <div className="col-span-2 text-right tabular-nums">{fmtNum(t.quantity, 8)}</div>
                <div className="col-span-2 text-right tabular-nums">{fmtVND(priceVnd)}</div>
                <div className="col-span-1 text-right tabular-nums text-xs text-muted-foreground">{t.fee_vnd ? fmtVND(t.fee_vnd) : "—"}</div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-rose-500"
                    onClick={() => { if (confirm("Xoá giao dịch này?")) removeMut.mutate(t.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function labelFor(h: { asset_type: "crypto" | "gold"; symbol: string }) {
  if (h.asset_type === "crypto") {
    const c = CRYPTO_OPTIONS.find((x) => x.id === h.symbol);
    return c ? `${c.symbol} · ${c.name}` : h.symbol;
  }
  const g = GOLD_OPTIONS.find((x) => x.id === h.symbol);
  return g ? g.name : h.symbol;
}

function computeHistory(transactions: Tx[]) {
  const byDate = new Map<string, Tx[]>();
  for (const t of transactions) {
    const d = t.executed_at.slice(0, 10);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(t);
  }
  const dates = Array.from(byDate.keys()).sort();

  type Pos = {
    asset_type: "crypto" | "gold"; symbol: string;
    quantity: number; avgCostVnd: number; costVnd: number;
    realizedPlVnd: number; totalFeeVnd: number;
  };

  const positions = new Map<string, Pos>();
  let totalInvested = 0;
  const history: { date: string; invested: number; costBasis: number; realized: number; marketValue?: number; unrealized?: number; totalPl?: number }[] = [];

  for (const d of dates) {
    const txs = [...byDate.get(d)!].sort((a, b) => a.executed_at.localeCompare(b.executed_at));
    for (const t of txs) {
      const key = `${t.asset_type}:${t.symbol}`;
      const priceVnd = t.price_vnd ?? (t.price_usd != null ? t.price_usd * 25_400 : 0);
      const cur: Pos = positions.get(key) ?? {
        asset_type: t.asset_type, symbol: t.symbol,
        quantity: 0, avgCostVnd: 0, costVnd: 0,
        realizedPlVnd: 0, totalFeeVnd: 0,
      };
      cur.totalFeeVnd += t.fee_vnd ?? 0;
      if (t.side === "buy") {
        const newQty = cur.quantity + t.quantity;
        const newCost = cur.costVnd + priceVnd * t.quantity + (t.fee_vnd ?? 0);
        cur.quantity = newQty;
        cur.costVnd = newCost;
        cur.avgCostVnd = newQty > 0 ? newCost / newQty : 0;
        totalInvested += priceVnd * t.quantity + (t.fee_vnd ?? 0);
      } else {
        const sellQty = Math.min(t.quantity, cur.quantity);
        const proceeds = priceVnd * sellQty - (t.fee_vnd ?? 0);
        const cb = cur.avgCostVnd * sellQty;
        cur.realizedPlVnd += proceeds - cb;
        cur.quantity -= sellQty;
        cur.costVnd = cur.avgCostVnd * cur.quantity;
      }
      positions.set(key, cur);
    }
    const costBasis = Array.from(positions.values()).reduce((s, p) => s + p.costVnd, 0);
    const realized = Array.from(positions.values()).reduce((s, p) => s + p.realizedPlVnd, 0);
    history.push({ date: d, invested: totalInvested, costBasis, realized });
  }
  return history;
}

function PortfolioChart({ transactions, totals }: { transactions: Tx[]; totals: { current: number; cost: number; realized: number } }) {
  const history = useMemo(() => {
    const h = computeHistory(transactions);
    if (h.length === 0) return [];
    const today = new Date().toISOString().slice(0, 10);
    const last = h[h.length - 1];
    if (last.date !== today) {
      h.push({ date: today, invested: last.invested, costBasis: totals.cost, realized: totals.realized });
    } else {
      last.costBasis = totals.cost;
      last.realized = totals.realized;
    }
    const final = h[h.length - 1];
    (final as any).marketValue = totals.current;
    return h;
  }, [transactions, totals]);

  if (history.length < 2) return null;

  return (
    <div className="rounded-lg border border-border p-4 mb-6">
      <Tabs defaultValue="value">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Hiệu suất theo thời gian</div>
          <TabsList className="h-7">
            <TabsTrigger value="value" className="text-xs px-2">Giá trị</TabsTrigger>
            <TabsTrigger value="pl" className="text-xs px-2">P/L</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="value">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => new Date(v).toLocaleDateString("vi-VN", { day: "numeric", month: "short" })} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => {
                  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
                  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
                  if (v >= 1_000) return (v / 1_000).toFixed(0) + "k";
                  return String(v);
                }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={({ payload, label }) => {
                  if (!payload?.length) return null;
                  const p = payload[0].payload as any;
                  return (
                    <div className="bg-card border border-border rounded-md p-2 shadow-lg text-xs">
                      <div className="font-medium mb-1">{new Date(label as string).toLocaleDateString("vi-VN")}</div>
                      <div className="flex justify-between gap-4 text-muted-foreground"><span>Vốn đã bỏ ra</span><span className="tabular-nums text-foreground">{fmtVND(p.invested)}</span></div>
                      <div className="flex justify-between gap-4 text-muted-foreground"><span>Giá trị sổ sách</span><span className="tabular-nums text-foreground">{fmtVND(p.costBasis)}</span></div>
                      {p.marketValue != null && <div className="flex justify-between gap-4 text-emerald-500"><span>Giá trị thị trường</span><span className="tabular-nums font-medium">{fmtVND(p.marketValue)}</span></div>}
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="invested" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.08} strokeWidth={2} dot={false} name="Vốn đã bỏ ra" />
                <Area type="monotone" dataKey="costBasis" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} strokeWidth={2} dot={false} name="Giá trị sổ sách" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        <TabsContent value="pl">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => new Date(v).toLocaleDateString("vi-VN", { day: "numeric", month: "short" })} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => {
                  const abs = Math.abs(v);
                  if (abs >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
                  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
                  if (abs >= 1_000) return (v / 1_000).toFixed(0) + "k";
                  return String(v);
                }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={({ payload, label }) => {
                  if (!payload?.length) return null;
                  const p = payload[0].payload as any;
                  return (
                    <div className="bg-card border border-border rounded-md p-2 shadow-lg text-xs">
                      <div className="font-medium mb-1">{new Date(label as string).toLocaleDateString("vi-VN")}</div>
                      <div className="flex justify-between gap-4 text-muted-foreground"><span>Lãi/Lỗ đã chốt</span><span className={`tabular-nums font-medium ${p.realized >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtVND(p.realized)}</span></div>
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="realized" stroke="#10b981" fill="#10b981" fillOpacity={0.12} strokeWidth={2} dot={false} name="Lãi/Lỗ đã chốt" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: "up" | "down" }) {
  const cls = accent === "up" ? "text-emerald-500" : accent === "down" ? "text-rose-500" : "text-foreground";
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function TransactionDialog() {
  const qc = useQueryClient();
  const save = useServerFn(addTransaction);
  const [open, setOpen] = useState(false);
  const [assetType, setAssetType] = useState<"crypto" | "gold">("crypto");
  const [symbol, setSymbol] = useState<string>(CRYPTO_OPTIONS[0].id);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<number>(0);
  const [priceVnd, setPriceVnd] = useState<number>(0);
  const [feeVnd, setFeeVnd] = useState<number>(0);
  const [executedAt, setExecutedAt] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState("");

  const reset = () => {
    setQuantity(0); setPriceVnd(0); setFeeVnd(0); setNote("");
  };

  const saveMut = useMutation({
    mutationFn: () => save({
      data: {
        asset_type: assetType,
        symbol,
        side,
        quantity: Number(quantity),
        price_vnd: Number(priceVnd) || 0,
        price_usd: null,
        fee_vnd: Number(feeVnd) || 0,
        executed_at: new Date(executedAt).toISOString(),
        note: note || null,
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio-transactions"] });
      reset();
      setOpen(false);
    },
  });

  const options = assetType === "crypto"
    ? CRYPTO_OPTIONS.map((o) => ({ id: o.id, label: `${o.symbol} · ${o.name}` }))
    : GOLD_OPTIONS.map((o) => ({ id: o.id, label: o.name }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Thêm giao dịch</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm giao dịch</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hướng</Label>
              <Select value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Mua</SelectItem>
                  <SelectItem value="sell">Bán</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="executed_at">Ngày giao dịch</Label>
              <Input id="executed_at" type="date" value={executedAt}
                onChange={(e) => setExecutedAt(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Loại</Label>
              <Select value={assetType} onValueChange={(v) => {
                const t = v as "crypto" | "gold";
                setAssetType(t);
                setSymbol(t === "crypto" ? CRYPTO_OPTIONS[0].id : GOLD_OPTIONS[0].id);
              }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="gold">Vàng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tài sản</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qty">Số lượng</Label>
              <Input id="qty" type="number" step="any" value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="price">Giá / đơn vị (VND)</Label>
              <Input id="price" type="number" value={priceVnd}
                onChange={(e) => setPriceVnd(Number(e.target.value))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="fee">Phí giao dịch (VND)</Label>
            <Input id="fee" type="number" value={feeVnd}
              onChange={(e) => setFeeVnd(Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="note">Ghi chú</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Giá vốn trung bình và số lượng còn lại sẽ tự động tính từ toàn bộ giao dịch theo phương pháp <strong>Weighted Average Cost</strong>.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !quantity || quantity <= 0 || !priceVnd || priceVnd <= 0}
          >
            {saveMut.isPending ? "Đang lưu…" : "Lưu giao dịch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}