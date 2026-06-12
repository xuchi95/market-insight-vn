import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, ChevronLeft, Coins, Bitcoin, DollarSign, Sun, Moon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_PUSH_PREFS,
  fetchPushPreferences,
  getCurrentPushEndpoint,
  getPushState,
  isPushSupported,
  savePushPreferences,
  subscribePush,
  type PushPreferences,
  type PushState,
} from "@/lib/push";

const TITLE = "Cài đặt thông báo — MarketWatch";
const DESC = "Chọn loại tài sản (vàng, crypto, ngoại tệ) và khung giờ nhận push notification.";

export const Route = createFileRoute("/cai-dat/thong-bao")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: NotificationSettingsPage,
});

type Row = {
  key: keyof PushPreferences;
  title: string;
  desc: string;
  Icon: typeof Bell;
};

const ASSET_ROWS: Row[] = [
  { key: "notify_gold", title: "Vàng (SJC)", desc: "Giá vàng SJC trong nước.", Icon: Coins },
  { key: "notify_crypto", title: "Crypto (BTC, ETH)", desc: "Bitcoin và Ethereum theo USD.", Icon: Bitcoin },
  { key: "notify_forex", title: "Ngoại tệ (USD)", desc: "Tỷ giá USD/VND tham khảo.", Icon: DollarSign },
];

const PERIOD_ROWS: Row[] = [
  { key: "notify_morning", title: "Buổi sáng (9:00)", desc: "Bản tin giá đầu ngày.", Icon: Sun },
  { key: "notify_evening", title: "Buổi chiều (18:00)", desc: "Tổng kết giá cuối ngày.", Icon: Moon },
];

function NotificationSettingsPage() {
  const [state, setState] = useState<PushState>("default");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PushPreferences>(DEFAULT_PUSH_PREFS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof PushPreferences | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  async function load() {
    if (!isPushSupported()) {
      setState("unsupported");
      setLoading(false);
      return;
    }
    const s = await getPushState();
    setState(s);
    const ep = await getCurrentPushEndpoint();
    setEndpoint(ep);
    if (ep) {
      try {
        const p = await fetchPushPreferences(ep);
        setPrefs(p);
      } catch {
        /* keep defaults */
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      const next = await subscribePush();
      setState(next);
      if (next === "subscribed") {
        toast.success("Đã bật thông báo — bạn có thể tinh chỉnh ở dưới");
        await load();
      } else if (next === "denied") {
        toast.error("Trình duyệt đã chặn thông báo");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setSubscribing(false);
    }
  }

  async function toggle(key: keyof PushPreferences, value: boolean) {
    if (!endpoint) return;
    const prev = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingKey(key);
    try {
      await savePushPreferences(endpoint, { [key]: value });
    } catch (e) {
      setPrefs(prev);
      toast.error(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSavingKey(null);
    }
  }

  const disabled = !endpoint || state !== "subscribed";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <span className="mx-2 opacity-50">/</span>
          <Link to="/cai-dat" className="hover:text-foreground">Cài đặt</Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">Thông báo</span>
        </nav>

        <header className="mb-8 flex items-start gap-3">
          <Link
            to="/cai-dat"
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-3xl tracking-tight">Cài đặt thông báo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Chọn loại tài sản và khung giờ bạn muốn nhận push notification.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Đang tải cài đặt…
          </div>
        ) : state === "unsupported" ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Trình duyệt này không hỗ trợ Web Push. Hãy thử Chrome, Edge hoặc Safari mới nhất.
          </div>
        ) : state !== "subscribed" ? (
          <div className="rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--gold)]/40 bg-background text-[var(--gold)]">
                <Bell className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="font-medium">Bật thông báo giá</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {state === "denied"
                    ? "Trình duyệt đang chặn — hãy mở Cài đặt site và cho phép Notification rồi quay lại."
                    : "Bật để tinh chỉnh từng loại tài sản và khung giờ."}
                </p>
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={subscribing || state === "denied"}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/60 bg-[var(--gold)]/10 px-4 py-1.5 text-sm font-semibold text-[var(--gold)] hover:bg-[var(--gold)]/20 disabled:opacity-50"
                >
                  {subscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                  {state === "denied" ? "Đang bị chặn" : "Bật thông báo"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <PrefSection
              title="Loại tài sản"
              hint="Mỗi push gộp các tài sản bạn chọn thành 1 dòng ngắn."
              rows={ASSET_ROWS}
              prefs={prefs}
              onToggle={toggle}
              savingKey={savingKey}
              disabled={disabled}
            />
            <PrefSection
              title="Khung giờ"
              hint="Theo giờ Việt Nam. Bỏ chọn cả hai sẽ tạm ngưng toàn bộ push."
              rows={PERIOD_ROWS}
              prefs={prefs}
              onToggle={toggle}
              savingKey={savingKey}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Cài đặt áp dụng cho trình duyệt &amp; thiết bị hiện tại. Đăng ký lại trên máy khác sẽ tạo subscription riêng.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function PrefSection({
  title,
  hint,
  rows,
  prefs,
  onToggle,
  savingKey,
  disabled,
}: {
  title: string;
  hint: string;
  rows: Row[];
  prefs: PushPreferences;
  onToggle: (key: keyof PushPreferences, value: boolean) => void;
  savingKey: keyof PushPreferences | null;
  disabled: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>
      </header>
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const Icon = row.Icon;
          const checked = !!prefs[row.key];
          return (
            <li key={row.key} className="flex items-center gap-4 px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-muted text-[var(--gold)]">
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{row.title}</div>
                <div className="text-sm text-muted-foreground">{row.desc}</div>
              </div>
              {savingKey === row.key ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : null}
              <Switch
                checked={checked}
                disabled={disabled || savingKey !== null}
                onCheckedChange={(v) => onToggle(row.key, v)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}