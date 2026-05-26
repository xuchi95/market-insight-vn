import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Trash2, Plus, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import {
  loadAlerts,
  saveAlerts,
  createAlert,
  shouldTrigger,
  ensureNotificationPermission,
  sendBrowserNotification,
  type PriceAlert,
  type AlertDirection,
} from "@/lib/services/priceAlertsService";
import { fmtUSD, fmtTime } from "@/lib/format";
import { SectionCard } from "./SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const QUICK_COINS = ["BTC", "ETH"] as const;

export function PriceAlerts() {
  const { data: coins } = useQuery({
    queryKey: ["crypto"],
    queryFn: () => fetchCryptoPrices(),
    refetchInterval: 15000,
  });

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [symbol, setSymbol] = useState<string>("BTC");
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [threshold, setThreshold] = useState<string>("");
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");
  const firedRef = useRef<Set<string>>(new Set());

  // hydrate from localStorage on mount
  useEffect(() => {
    setAlerts(loadAlerts());
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  // persist on change
  useEffect(() => {
    saveAlerts(alerts);
  }, [alerts]);

  // available symbols come from coin list, with BTC/ETH always available
  const symbolOptions = useMemo(() => {
    const fromApi = (coins ?? []).map((c) => ({ symbol: c.symbol, name: c.name }));
    const seen = new Set(fromApi.map((c) => c.symbol));
    const defaults = QUICK_COINS.filter((s) => !seen.has(s)).map((s) => ({ symbol: s, name: s }));
    return [...defaults, ...fromApi];
  }, [coins]);

  const priceMap = useMemo(() => {
    const m = new Map<string, { priceUsd: number; name: string }>();
    (coins ?? []).forEach((c) => m.set(c.symbol, { priceUsd: c.priceUsd, name: c.name }));
    return m;
  }, [coins]);

  const currentSelectedPrice = priceMap.get(symbol)?.priceUsd;

  // check triggers whenever prices update
  useEffect(() => {
    if (!coins || alerts.length === 0) return;
    let changed = false;
    const next = alerts.map((a) => {
      const info = priceMap.get(a.symbol);
      if (!info) return a;
      if (shouldTrigger(a, info.priceUsd) && !firedRef.current.has(a.id)) {
        firedRef.current.add(a.id);
        changed = true;
        const dirLabel = a.direction === "above" ? "vượt" : "giảm dưới";
        const title = `${a.symbol} ${dirLabel} ${fmtUSD(a.threshold, a.threshold < 1 ? 4 : 2)}`;
        const body = `Giá hiện tại: ${fmtUSD(info.priceUsd, info.priceUsd < 1 ? 4 : 2)}`;
        toast(title, { description: body });
        sendBrowserNotification(`Cảnh báo giá ${a.symbol}`, `${title} — ${body}`);
        return { ...a, triggered: true, triggeredAt: Date.now(), triggeredPrice: info.priceUsd };
      }
      return a;
    });
    if (changed) setAlerts(next);
  }, [coins, priceMap, alerts]);

  const addAlert = async () => {
    const t = Number(threshold);
    if (!symbol || !Number.isFinite(t) || t <= 0) {
      toast.error("Nhập ngưỡng giá hợp lệ (USD)");
      return;
    }
    const info = priceMap.get(symbol);
    const a = createAlert({
      symbol,
      name: info?.name ?? symbol,
      direction,
      threshold: t,
    });
    setAlerts((prev) => [a, ...prev]);
    setThreshold("");
    toast.success(`Đã đặt cảnh báo ${symbol} ${direction === "above" ? "≥" : "≤"} ${fmtUSD(t, t < 1 ? 4 : 2)}`);
    const perm = await ensureNotificationPermission();
    setNotifPerm(perm);
  };

  const removeAlert = (id: string) => {
    firedRef.current.delete(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const resetAlert = (id: string) => {
    firedRef.current.delete(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, triggered: false, triggeredAt: undefined, triggeredPrice: undefined } : a)));
  };

  const requestPerm = async () => {
    const p = await ensureNotificationPermission();
    setNotifPerm(p);
    if (p === "granted") toast.success("Đã bật thông báo trình duyệt");
    else if (p === "denied") toast.error("Trình duyệt đã chặn thông báo. Hãy bật trong cài đặt.");
  };

  const quickFill = (s: string, dir: AlertDirection) => {
    setSymbol(s);
    setDirection(dir);
    const p = priceMap.get(s)?.priceUsd;
    if (p) {
      const suggest = dir === "above" ? p * 1.05 : p * 0.95;
      setThreshold(suggest.toFixed(suggest < 1 ? 4 : 2));
    }
  };

  return (
    <SectionCard
      id="price-alerts"
      icon={<Bell className="h-4 w-4" />}
      title="Cảnh báo giá BTC / ETH"
      description="Nhận thông báo khi giá vượt hoặc giảm dưới ngưỡng bạn đặt"
      action={
        notifPerm !== "granted" ? (
          <Button variant="outline" size="sm" onClick={requestPerm} className="gap-1">
            <BellOff className="h-3.5 w-3.5" /> Bật thông báo
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Bell className="h-3.5 w-3.5 text-primary" /> Đã bật
          </span>
        )
      }
    >
      <div className="space-y-4">
        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Nhanh:</span>
          {QUICK_COINS.map((s) => (
            <div key={s} className="inline-flex items-center gap-1">
              <button
                onClick={() => quickFill(s, "above")}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs hover:border-primary/50"
              >
                <ArrowUp className="h-3 w-3 text-emerald-500" /> {s} +5%
              </button>
              <button
                onClick={() => quickFill(s, "below")}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs hover:border-primary/50"
              >
                <ArrowDown className="h-3 w-3 text-rose-500" /> {s} −5%
              </button>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 sm:grid-cols-[140px_140px_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Coin</label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {symbolOptions.map((o) => (
                  <SelectItem key={o.symbol} value={o.symbol}>{o.symbol} — {o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Điều kiện</label>
            <Select value={direction} onValueChange={(v) => setDirection(v as AlertDirection)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Vượt ≥</SelectItem>
                <SelectItem value="below">Giảm ≤</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Ngưỡng (USD){currentSelectedPrice ? ` • hiện tại ${fmtUSD(currentSelectedPrice, currentSelectedPrice < 1 ? 4 : 2)}` : ""}
            </label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="VD: 100000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          <Button onClick={addAlert} className="gap-1"><Plus className="h-4 w-4" /> Thêm</Button>
        </div>

        {/* List */}
        <div className="rounded-lg border border-border divide-y divide-border">
          {alerts.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có cảnh báo nào. Đặt ngưỡng giá để nhận thông báo khi thị trường vượt mức.
            </div>
          )}
          {alerts.map((a) => {
            const cur = priceMap.get(a.symbol)?.priceUsd;
            const decimals = a.threshold < 1 ? 4 : 2;
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 min-w-[80px]">
                  {a.direction === "above" ? (
                    <ArrowUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-rose-500" />
                  )}
                  <span className="font-semibold">{a.symbol}</span>
                </div>
                <div className="flex-1">
                  <div>
                    {a.direction === "above" ? "Khi giá ≥ " : "Khi giá ≤ "}
                    <span className="font-semibold tabular">{fmtUSD(a.threshold, decimals)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cur != null ? <>Hiện tại: <span className="tabular">{fmtUSD(cur, decimals)}</span></> : "Đang tải giá..."}
                    {a.triggered && a.triggeredAt && (
                      <> • Đã kích hoạt lúc {fmtTime(a.triggeredAt)}{a.triggeredPrice != null ? ` @ ${fmtUSD(a.triggeredPrice, decimals)}` : ""}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {a.triggered ? (
                    <span className="rounded-full bg-amber-500/15 text-amber-500 text-xs px-2 py-0.5">Đã trúng</span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/10 text-emerald-500 text-xs px-2 py-0.5">Đang theo dõi</span>
                  )}
                  {a.triggered && (
                    <Button variant="ghost" size="icon" onClick={() => resetAlert(a.id)} title="Đặt lại">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeAlert(a.id)} title="Xoá">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}