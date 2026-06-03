import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, Shield, BarChart3, Sparkles, X, Check } from "lucide-react";

const STORAGE_KEY = "mw_cookie_consent";
const VERSION = "1.0";

type Prefs = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

type StoredConsent = {
  version: string;
  acceptedAt: string;
  prefs: Prefs;
};

function readConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== VERSION) return null;
    // 12 month expiry
    const ageMs = Date.now() - new Date(parsed.acceptedAt).getTime();
    if (ageMs > 1000 * 60 * 60 * 24 * 365) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(prefs: Prefs) {
  const payload: StoredConsent = {
    version: VERSION,
    acceptedAt: new Date().toISOString(),
    prefs,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("mw:cookie-consent", { detail: payload }));
  } catch {
    /* ignore */
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    if (!readConsent()) {
      // Slight delay so it doesn't fight the first paint
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const open = () => {
      setShowDetails(true);
      setVisible(true);
    };
    window.addEventListener("mw:open-cookie-settings", open);
    return () => window.removeEventListener("mw:open-cookie-settings", open);
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    writeConsent({ necessary: true, functional: true, analytics: true, marketing: true });
    setVisible(false);
  };
  const rejectAll = () => {
    writeConsent({ necessary: true, functional: false, analytics: false, marketing: false });
    setVisible(false);
  };
  const savePrefs = () => {
    writeConsent(prefs);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="mw-cookie-title"
      className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-3 sm:px-5 sm:pb-5 animate-in slide-in-from-bottom-6 fade-in duration-500"
    >
      <div
        className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--gold)_30%,var(--border))] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--gold)_40%,transparent)] backdrop-blur-xl"
        style={{
          backgroundImage:
            "linear-gradient(135deg, color-mix(in oklab, var(--gold) 8%, transparent) 0%, transparent 60%)",
        }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--gold)_18%,transparent)] text-[var(--gold)]">
              <Cookie className="h-3.5 w-3.5" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
              MarketWatch · Cookie
            </span>
          </div>
          <button
            type="button"
            onClick={rejectAll}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Đóng và chỉ dùng cookie thiết yếu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4 sm:px-5 sm:py-5">
          {!showDetails ? (
            <>
              <h2 id="mw-cookie-title" className="font-display text-lg leading-snug text-foreground sm:text-xl">
                Chúng tôi dùng <span className="text-[var(--gold)]">cookie</span> để giữ phiên đăng nhập và đo lường hiệu năng.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Cookie thiết yếu luôn bật để Website vận hành an toàn. Bạn có thể đồng ý tất cả, từ chối tuỳ chọn,
                hoặc tinh chỉnh theo nhu cầu. Xem chi tiết tại{" "}
                <Link to="/chinh-sach-cookie" className="text-foreground underline underline-offset-2 hover:text-[var(--gold)]">
                  Chính sách Cookie
                </Link>{" "}
                và{" "}
                <Link to="/chinh-sach-bao-mat" className="text-foreground underline underline-offset-2 hover:text-[var(--gold)]">
                  Chính sách dữ liệu
                </Link>
                .
              </p>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                >
                  Tuỳ chỉnh
                </button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-[var(--gold)]/60 hover:bg-card/70"
                  >
                    Chỉ thiết yếu
                  </button>
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--gold)] px-4 text-sm font-semibold text-[var(--gold-foreground)] shadow-[0_8px_24px_-10px_color-mix(in_oklab,var(--gold)_70%,transparent)] transition-transform hover:-translate-y-0.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Đồng ý tất cả
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 id="mw-cookie-title" className="font-display text-lg leading-snug text-foreground sm:text-xl">
                Tuỳ chỉnh <span className="text-[var(--gold)]">Cookie</span>
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Bạn có quyền bật/tắt từng loại cookie không thiết yếu. Lựa chọn được lưu 12 tháng.
              </p>

              <div className="mt-4 space-y-2">
                <CookieRow
                  icon={<Shield className="h-3.5 w-3.5" />}
                  title="Thiết yếu"
                  desc="Bắt buộc cho đăng nhập, bảo mật, lưu lựa chọn giao diện."
                  checked
                  disabled
                />
                <CookieRow
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  title="Chức năng"
                  desc="Ghi nhớ watchlist, khung biểu đồ, tuỳ chọn cá nhân."
                  checked={prefs.functional}
                  onChange={(v) => setPrefs((p) => ({ ...p, functional: v }))}
                />
                <CookieRow
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  title="Phân tích"
                  desc="Đo lưu lượng, hiệu năng, lỗi — ẩn danh, không nhận dạng cá nhân."
                  checked={prefs.analytics}
                  onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                />
                <CookieRow
                  icon={<Cookie className="h-3.5 w-3.5" />}
                  title="Tiếp thị"
                  desc="Hiện chưa kích hoạt. Sẽ xin lại đồng ý nếu triển khai."
                  checked={prefs.marketing}
                  onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={rejectAll}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:border-[var(--gold)]/60"
                >
                  Từ chối tất cả
                </button>
                <button
                  type="button"
                  onClick={savePrefs}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--gold)] px-4 text-sm font-semibold text-[var(--gold-foreground)] shadow-[0_8px_24px_-10px_color-mix(in_oklab,var(--gold)_70%,transparent)]"
                >
                  Lưu lựa chọn
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CookieRow({
  icon,
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors ${
        disabled ? "opacity-80" : "hover:border-[var(--gold)]/40 hover:bg-background/70"
      }`}
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-[var(--gold)]">
        {icon}
      </span>
      <span className="flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span
            role="switch"
            aria-checked={checked}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              checked ? "bg-[var(--gold)]" : "bg-muted"
            } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${
                checked ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
            <input
              type="checkbox"
              className="absolute inset-0 cursor-pointer opacity-0"
              checked={checked}
              disabled={disabled}
              onChange={(e) => onChange?.(e.target.checked)}
              aria-label={title}
            />
          </span>
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{desc}</span>
      </span>
    </label>
  );
}
