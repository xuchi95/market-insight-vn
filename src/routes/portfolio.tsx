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
import { listHoldings, upsertHolding, deleteHolding } from "@/lib/portfolio.functions";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fmtVND, fmtNum, fmtPct } from "@/lib/format";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

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

type Holding = {
  id: string;
  asset_type: "crypto" | "gold";
  symbol: string;
  quantity: number;
  avg_cost_usd: number | null;
  avg_cost_vnd: number | null;
  note: string | null;
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
  const list = useServerFn(listHoldings);
  const remove = useServerFn(deleteHolding);

  const holdingsQ = useQuery({
    queryKey: ["portfolio-holdings"],
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio-holdings"] }),
  });

  const holdings: Holding[] = (holdingsQ.data?.items ?? []) as Holding[];

  const enriched = useMemo(() => {
    const usdVnd = 25_400;
    return holdings.map((h) => {
      let priceVnd = 0;
      let priceUsd = 0;
      if (h.asset_type === "crypto") {
        const coin = (cryptoQ.data ?? []).find((c) => c.id === h.symbol);
        priceVnd = coin?.priceVnd ?? 0;
        priceUsd = coin?.priceUsd ?? 0;
      } else {
        const g = (goldQ.data ?? []).find((x) => x.id === h.symbol);
        if (g) {
          if (g.unit.includes("USD")) {
            priceUsd = (g.buy + g.sell) / 2;
            priceVnd = priceUsd * usdVnd;
          } else {
            priceVnd = (g.buy + g.sell) / 2;
            priceUsd = priceVnd / usdVnd;
          }
        }
      }
      const currentVnd = priceVnd * h.quantity;
      const costVnd = h.avg_cost_vnd != null
        ? h.avg_cost_vnd * h.quantity
        : h.avg_cost_usd != null
        ? h.avg_cost_usd * usdVnd * h.quantity
        : 0;
      const pl = currentVnd - costVnd;
      const plPct = costVnd > 0 ? (pl / costVnd) * 100 : 0;
      return { ...h, priceVnd, priceUsd, currentVnd, costVnd, pl, plPct };
    });
  }, [holdings, cryptoQ.data, goldQ.data]);

  const totals = useMemo(() => {
    const current = enriched.reduce((s, h) => s + h.currentVnd, 0);
    const cost = enriched.reduce((s, h) => s + h.costVnd, 0);
    const pl = current - cost;
    const plPct = cost > 0 ? (pl / cost) * 100 : 0;
    return { current, cost, pl, plPct };
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
            Theo dõi tổng giá trị, lãi/lỗ realtime cho crypto và vàng. Dữ liệu chỉ bạn nhìn thấy.
          </p>
        </div>
        <HoldingDialog />
      </header>

      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <Metric label="Tổng giá trị" value={fmtVND(totals.current)} />
        <Metric label="Tổng vốn" value={fmtVND(totals.cost)} />
        <Metric label="Lãi / Lỗ" value={fmtVND(totals.pl)} accent={totals.pl >= 0 ? "up" : "down"} />
        <Metric label="% Lãi / Lỗ" value={fmtPct(totals.plPct)} accent={totals.plPct >= 0 ? "up" : "down"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-lg border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-card text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
            <div className="col-span-3">Tài sản</div>
            <div className="col-span-2 text-right">Số lượng</div>
            <div className="col-span-2 text-right">Giá hiện tại</div>
            <div className="col-span-2 text-right">Giá trị</div>
            <div className="col-span-2 text-right">P/L</div>
            <div className="col-span-1 text-right" />
          </div>
          {holdingsQ.isLoading && (
            <div className="p-6 text-sm text-muted-foreground text-center">Đang tải…</div>
          )}
          {!holdingsQ.isLoading && enriched.length === 0 && (
            <div className="p-8 text-sm text-muted-foreground text-center">
              Chưa có tài sản nào. Bấm “Thêm tài sản” để bắt đầu.
            </div>
          )}
          {enriched.map((h) => (
            <div
              key={h.id}
              className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent/40 transition-colors items-center"
            >
              <div className="md:col-span-3">
                <div className="font-medium text-sm">{labelFor(h)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{h.asset_type}</div>
              </div>
              <div className="md:col-span-2 text-right tabular-nums text-sm">{fmtNum(h.quantity, 8)}</div>
              <div className="md:col-span-2 text-right tabular-nums text-sm">{fmtVND(h.priceVnd)}</div>
              <div className="md:col-span-2 text-right tabular-nums text-sm">{fmtVND(h.currentVnd)}</div>
              <div className={`md:col-span-2 text-right tabular-nums text-sm ${h.pl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                <div>{fmtVND(h.pl)}</div>
                <div className="text-[10px]">{fmtPct(h.plPct)}</div>
              </div>
              <div className="md:col-span-1 flex justify-end gap-1">
                <HoldingDialog initial={h} />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-rose-500"
                  onClick={() => {
                    if (confirm(`Xoá ${labelFor(h)}?`)) removeMut.mutate(h.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
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

function Metric({ label, value, accent }: { label: string; value: string; accent?: "up" | "down" }) {
  const cls = accent === "up" ? "text-emerald-500" : accent === "down" ? "text-rose-500" : "text-foreground";
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function HoldingDialog({ initial }: { initial?: Holding }) {
  const qc = useQueryClient();
  const save = useServerFn(upsertHolding);
  const [open, setOpen] = useState(false);
  const [assetType, setAssetType] = useState<"crypto" | "gold">(initial?.asset_type ?? "crypto");
  const [symbol, setSymbol] = useState(initial?.symbol ?? CRYPTO_OPTIONS[0].id);
  const [quantity, setQuantity] = useState(initial?.quantity ?? 0);
  const [costVnd, setCostVnd] = useState(initial?.avg_cost_vnd ?? 0);
  const [note, setNote] = useState(initial?.note ?? "");

  const saveMut = useMutation({
    mutationFn: () => save({
      data: {
        id: initial?.id,
        asset_type: assetType,
        symbol,
        quantity: Number(quantity),
        avg_cost_vnd: Number(costVnd) || null,
        avg_cost_usd: null,
        note: note || null,
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio-holdings"] });
      setOpen(false);
    },
  });

  const options = assetType === "crypto" ? CRYPTO_OPTIONS.map(o => ({ id: o.id, label: `${o.symbol} · ${o.name}` })) : GOLD_OPTIONS.map(o => ({ id: o.id, label: o.name }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
        ) : (
          <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Thêm tài sản</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa tài sản" : "Thêm tài sản"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
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
          <div>
            <Label htmlFor="qty">Số lượng</Label>
            <Input id="qty" type="number" step="any" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {assetType === "gold" ? "Đơn vị: chỉ (vàng VN) hoặc oz (XAU)" : "Đơn vị: số đồng coin"}
            </p>
          </div>
          <div>
            <Label htmlFor="cost">Giá vốn trung bình (VND/đơn vị)</Label>
            <Input id="cost" type="number" value={costVnd} onChange={(e) => setCostVnd(Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="note">Ghi chú</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !quantity || quantity <= 0}
          >
            {saveMut.isPending ? "Đang lưu…" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}