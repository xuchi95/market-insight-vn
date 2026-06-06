import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, BellRing, BellOff } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyWatchAlertPrefs,
  updateWatchAlertPrefs,
  setGlobalWatchAlertsEnabled,
} from "@/lib/watchlist/alerts.functions";

export const Route = createFileRoute("/cai-dat/canh-bao")({
  head: () => ({
    meta: [
      { title: "Cảnh báo theo dõi — MarketWatch" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AlertsSettingsPage,
});

function AlertsSettingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/dang-nhap", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">Cảnh báo theo dõi</span>
        </nav>
        <header className="mb-8">
          <div className="eyebrow text-[var(--gold)]">Cài đặt</div>
          <h1 className="font-display text-4xl mt-1">Cảnh báo theo dõi</h1>
        </header>
        {!user ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : (
          <AlertsList />
        )}
      </main>
      <Footer />
    </div>
  );
}

function AlertsList() {
  const qc = useQueryClient();
  const fetchPrefs = useServerFn(getMyWatchAlertPrefs);
  const save = useServerFn(updateWatchAlertPrefs);
  const saveGlobal = useServerFn(setGlobalWatchAlertsEnabled);
  const { data, isLoading } = useQuery({
    queryKey: ["watch-alert-prefs"],
    queryFn: () => fetchPrefs(),
  });
  const [busy, setBusy] = useState<string | null>(null);

  async function update(symbol: string, next: { emailEnabled?: boolean; thresholdPct?: number }, currentEmail: boolean, currentPct: number) {
    setBusy(symbol);
    try {
      await save({
        data: {
          symbol,
          emailEnabled: next.emailEnabled ?? currentEmail,
          thresholdPct: next.thresholdPct ?? currentPct,
        },
      });
      qc.invalidateQueries({ queryKey: ["watch-alert-prefs"] });
    } catch (e: any) {
      toast.error("Không thể lưu", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function toggleGlobal(v: boolean) {
    setBusy("__global__");
    try {
      await saveGlobal({ data: { enabled: v } });
      qc.invalidateQueries({ queryKey: ["watch-alert-prefs"] });
      toast.success(v ? "Đã bật cảnh báo" : "Đã tạm dừng cảnh báo");
    } catch (e: any) {
      toast.error("Không thể lưu", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }

  const items = data?.items ?? [];
  const globalEnabled = data?.globalEnabled ?? true;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card/40 p-5 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium flex items-center gap-1.5">
            {globalEnabled ? <BellRing className="h-4 w-4 text-[var(--gold)]" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            Cảnh báo email tổng
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tắt công tắc này để tạm dừng tất cả email cảnh báo theo dõi.
          </p>
        </div>
        <Switch
          checked={globalEnabled}
          disabled={busy === "__global__"}
          onCheckedChange={toggleGlobal}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card/40 overflow-hidden">
        <header className="px-5 py-3 border-b border-border text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Tài sản đang theo dõi ({items.length})
        </header>
        {items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Chưa có tài sản nào. Mở trang chi tiết của một tài sản và bấm <strong>Theo dõi</strong>.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((it) => (
              <li key={it.symbol} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <Link to={it.to_path as any} className="font-medium hover:text-[var(--gold)] truncate block">{it.label}</Link>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {it.category} · {it.symbol.toUpperCase()}
                    {it.last_alert_sent_at && ` · Gần nhất ${new Date(it.last_alert_sent_at).toLocaleString("vi-VN")}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[3, 5, 10, 15].map((v) => (
                      <button
                        key={v}
                        type="button"
                        disabled={busy === it.symbol || !it.email_alerts_enabled || !globalEnabled}
                        onClick={() => update(it.symbol, { thresholdPct: v }, it.email_alerts_enabled, Number(it.alert_threshold_pct))}
                        className={`rounded-md border px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          Number(it.alert_threshold_pct) === v
                            ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                            : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                  <Switch
                    checked={!!it.email_alerts_enabled && globalEnabled}
                    disabled={busy === it.symbol || !globalEnabled}
                    onCheckedChange={(v) => update(it.symbol, { emailEnabled: v }, it.email_alerts_enabled, Number(it.alert_threshold_pct))}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}