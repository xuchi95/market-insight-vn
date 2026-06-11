import { useEffect, useState } from "react";
import { Download, Share, X, Plus } from "lucide-react";

const DISMISS_KEY = "mw_pwa_install_dismissed_v1";
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 ngày

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function recentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function InstallPwaPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Trì hoãn để không che nội dung hero
      window.setTimeout(() => setVisible(true), 4000);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS không hỗ trợ beforeinstallprompt — gợi ý Share → Add to Home Screen
    if (isIos()) {
      window.setTimeout(() => {
        setShowIosHint(true);
        setVisible(true);
      }, 6000);
    }

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch { /* ignore */ }
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cài MarketWatch về màn hình chính"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-[var(--gold)]/40 bg-card/95 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in md:left-auto md:right-4 md:mx-0"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Đóng"
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-black">
          <img src="/icon-192.png" alt="" width={44} height={44} className="h-11 w-11" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight text-foreground">
            Cài MarketWatch về màn hình chính
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {showIosHint
              ? "Mở nhanh giá vàng, BTC, USD/VND như một ứng dụng — không cần qua trình duyệt."
              : "Truy cập tức thì giá vàng, crypto và tỷ giá — chạy toàn màn hình, không thanh địa chỉ."}
          </p>

          {showIosHint ? (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              Nhấn{" "}
              <Share className="mx-0.5 inline h-3.5 w-3.5 -translate-y-px text-[var(--gold)]" />{" "}
              <span className="font-medium text-foreground">Chia sẻ</span> ở thanh dưới Safari,
              rồi chọn{" "}
              <Plus className="mx-0.5 inline h-3.5 w-3.5 -translate-y-px text-[var(--gold)]" />{" "}
              <span className="font-medium text-foreground">Thêm vào MH chính</span>.
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={install}
                disabled={!deferred}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[var(--gold-foreground)] transition-colors hover:bg-[var(--gold-light)] disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Cài đặt
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Để sau
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}