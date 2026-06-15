import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Cookie, Shield, BarChart3, Sparkles, X, Check, LogOut, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMyCookieConsent, saveMyCookieConsent } from "@/lib/cookie-consent.functions";

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

function writeConsentRaw(payload: StoredConsent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("mw:cookie-consent", { detail: payload }));
  } catch {
    /* ignore */
  }
}

export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [forcedLogout, setForcedLogout] = useState(false);
  const { user, signOut } = useAuth();
  const fetchRemoteConsent = useServerFn(getMyCookieConsent);
  const pushRemoteConsent = useServerFn(saveMyCookieConsent);
  const [prefs, setPrefs] = useState<Prefs>({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    if (!readConsent()) {
      // Mount immediately, then trigger enter animation next frame
      setMounted(true);
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    }
  }, []);

  // Sync consent across devices: when a user logs in, pull their saved consent
  // from the backend. If it exists and is newer than local (or local missing),
  // hydrate localStorage and dismiss the banner without re-prompting.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchRemoteConsent();
        if (cancelled || !remote) return;
        if (remote.version !== VERSION) return;
        const local = readConsent();
        const remoteAt = new Date(remote.accepted_at).getTime();
        const localAt = local ? new Date(local.acceptedAt).getTime() : 0;
        if (remoteAt > localAt) {
          writeConsentRaw({
            version: remote.version,
            acceptedAt: remote.accepted_at,
            prefs: remote.prefs as Prefs,
          });
          // If banner was showing because local was empty, hide it now.
          setOpen(false);
          setTimeout(() => {
            setMounted(false);
            setShowDetails(false);
          }, 320);
        } else if (local && localAt > remoteAt) {
          // Local newer — push to backend so other devices catch up.
          await pushRemoteConsent({
            data: { version: local.version, prefs: local.prefs, userAgent: navigator.userAgent },
          }).catch(() => undefined);
        }
      } catch {
        /* network / auth issues — fail silently, local consent still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, fetchRemoteConsent, pushRemoteConsent]);

  useEffect(() => {
    const open = () => {
      setShowDetails(true);
      setMounted(true);
      requestAnimationFrame(() => setOpen(true));
    };
    window.addEventListener("mw:open-cookie-settings", open);
    return () => window.removeEventListener("mw:open-cookie-settings", open);
  }, []);

  // Lock body scroll on mobile when details panel is open
  useEffect(() => {
    if (!mounted || !open || !showDetails) return;
    const prev = document.body.style.overflow;
    if (window.matchMedia("(max-width: 640px)").matches) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted, open, showDetails]);

  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      setMounted(false);
      setShowDetails(false);
    }, 320);
  }, []);

  if (!mounted) return null;

  const syncToBackend = (next: Prefs) => {
    if (!user) return;
    pushRemoteConsent({
      data: { version: VERSION, prefs: next, userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined },
    }).catch(() => undefined);
  };

  const acceptAll = () => {
    const next: Prefs = { necessary: true, functional: true, analytics: true, marketing: true };
    writeConsent(next);
    syncToBackend(next);
    close();
  };
  const rejectAll = async () => {
    const next: Prefs = { necessary: true, functional: false, analytics: false, marketing: false };
    writeConsent(next);
    if (user) {
      // Push BEFORE signOut so the bearer is still valid.
      await pushRemoteConsent({
        data: { version: VERSION, prefs: next, userAgent: navigator.userAgent },
      }).catch(() => undefined);
      // "Từ chối tất cả": bắt buộc đăng xuất an toàn, chuyển sang chế độ ẩn danh
      try {
        await signOut();
      } catch {
        /* ignore */
      }
      setShowDetails(false);
      setForcedLogout(true);
      return;
    }
    close();
  };
  // "Chỉ thiết yếu": vẫn cho phép duy trì phiên đăng nhập, chỉ tắt cookie tuỳ chọn
  const essentialOnly = () => {
    const next: Prefs = { necessary: true, functional: false, analytics: false, marketing: false };
    writeConsent(next);
    syncToBackend(next);
    close();
  };
  const savePrefs = () => {
    writeConsent(prefs);
    syncToBackend(prefs);
    close();
  };

  return (
    <>
      {/* Forced-logout explanation modal */}
      {forcedLogout && <ForcedLogoutDialog onClose={() => { setForcedLogout(false); close(); }} />}

      {/* Full-screen blurred backdrop — always visible while the banner is open */}
      <div
        aria-hidden
        onClick={essentialOnly}
        className={`fixed inset-0 z-[79] bg-black/60 backdrop-blur-md transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mw-cookie-title"
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
        }}
      >
        <div
          className={`mx-auto w-full max-w-3xl max-h-[90vh] overflow-hidden border bg-[color-mix(in_oklab,var(--card)_94%,transparent)] backdrop-blur-xl
            rounded-2xl
            border-[color-mix(in_oklab,var(--gold)_30%,var(--border))]
            shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--gold)_40%,transparent)]
            transform-gpu transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
            ${open
              ? "translate-y-0 opacity-100 scale-100"
              : "translate-y-4 opacity-0 scale-95"
            }`}
          style={{
            backgroundImage:
              "linear-gradient(135deg, color-mix(in oklab, var(--gold) 9%, transparent) 0%, transparent 55%)",
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
              onClick={essentialOnly}
              className="-mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Inner content with crossfade between summary <-> details */}
          <div className="relative">
            {!showDetails ? (
              <div className="px-4 pb-5 pt-4 sm:px-5 sm:pb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 id="mw-cookie-title" className="text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
                  Chúng tôi dùng <span className="text-[var(--gold)]">cookie</span> để giữ phiên đăng nhập và đo lường hiệu năng.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Cookie thiết yếu luôn bật để Website vận hành an toàn. Bạn có thể đồng ý tất cả, từ chối tuỳ chọn, hoặc tinh chỉnh theo nhu cầu.{" "}
                  <Link to="/chinh-sach-cookie" className="text-foreground underline underline-offset-2 hover:text-[var(--gold)]">
                    Chính sách Cookie
                  </Link>
                  {" · "}
                  <Link to="/chinh-sach-bao-mat" className="text-foreground underline underline-offset-2 hover:text-[var(--gold)]">
                    Chính sách dữ liệu
                  </Link>
                </p>

                {/* Action stack: mobile = full-width stacked, desktop = inline */}
                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    className="order-3 inline-flex h-11 items-center justify-center rounded-xl border border-border bg-transparent px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-[var(--gold)]/40 hover:text-foreground sm:order-1 sm:h-10 sm:justify-self-start sm:border-0 sm:bg-transparent sm:px-2 sm:text-xs sm:uppercase sm:tracking-[0.18em]"
                  >
                    Tuỳ chỉnh
                  </button>
                  <button
                    type="button"
                    onClick={essentialOnly}
                    className="order-2 inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card/60 px-4 text-sm font-semibold text-foreground transition-colors hover:border-[var(--gold)]/60 hover:bg-card sm:order-2 sm:h-10"
                  >
                    Chỉ thiết yếu
                  </button>
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="order-1 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--gold)] px-5 text-sm font-semibold text-[var(--gold-foreground)] shadow-[0_10px_28px_-12px_color-mix(in_oklab,var(--gold)_70%,transparent)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-12px_color-mix(in_oklab,var(--gold)_80%,transparent)] active:translate-y-0 sm:order-3 sm:h-10"
                  >
                    <Check className="h-4 w-4" />
                    Đồng ý tất cả
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex max-h-[78vh] flex-col sm:max-h-none">
                <div className="overflow-y-auto px-4 pb-4 pt-4 sm:px-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 id="mw-cookie-title" className="text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
                    Tuỳ chỉnh <span className="text-[var(--gold)]">Cookie</span>
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Bật/tắt từng nhóm cookie không thiết yếu. Lựa chọn được lưu 12 tháng.
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
                      desc="Gửi thông báo đẩy nhắc giá BTC, ETH, USD, SJC lúc 9h và 18h — có thể tắt bất kỳ lúc nào."
                      checked={prefs.marketing}
                      onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                    />
                  </div>
                </div>

                {/* Sticky CTA bar — full width on mobile */}
                <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-border/60 bg-[color-mix(in_oklab,var(--card)_96%,transparent)] px-4 py-3 backdrop-blur sm:flex sm:justify-end sm:px-5">
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card/60 px-4 text-sm font-semibold text-foreground hover:border-[var(--gold)]/60 sm:h-10"
                  >
                    Từ chối tất cả
                  </button>
                  <button
                    type="button"
                    onClick={savePrefs}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--gold)] px-5 text-sm font-semibold text-[var(--gold-foreground)] shadow-[0_10px_28px_-12px_color-mix(in_oklab,var(--gold)_70%,transparent)] transition-all hover:-translate-y-0.5 active:translate-y-0 sm:h-10"
                  >
                    Lưu lựa chọn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
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
            />
          </span>
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{desc}</span>
      </span>
    </label>
  );
}

function ForcedLogoutDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mw-forced-logout-title"
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center px-3 pb-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--down)_30%,var(--border))] bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-start gap-3 border-b border-border/60 bg-[color-mix(in_oklab,var(--down)_10%,transparent)] px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--down)_18%,transparent)] text-[var(--down)]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 id="mw-forced-logout-title" className="font-display text-lg leading-snug text-foreground">
              Bạn đã được đăng xuất
            </h2>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--down)]">
              Không chấp nhận Cookie
            </p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Để duy trì phiên đăng nhập an toàn, MarketWatch bắt buộc lưu một số <strong className="text-foreground">cookie thiết yếu</strong> (token xác thực, chống CSRF, ghi nhớ thiết bị tin cậy).
          </p>
          <p>
            Vì bạn vừa <strong className="text-foreground">từ chối</strong> bảng yêu cầu cookie, chúng tôi đã <strong className="text-foreground">tự động đăng xuất</strong> tài khoản của bạn theo Nghị định 13/2023/NĐ-CP và{" "}
            <Link to="/chinh-sach-cookie" className="text-foreground underline underline-offset-2 hover:text-[var(--gold)]" onClick={onClose}>
              Chính sách Cookie
            </Link>
            . Bạn vẫn có thể tiếp tục xem nội dung công khai.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Muốn dùng lại tài khoản? Hãy bấm <em>Đồng ý &amp; đăng nhập lại</em> rồi đăng nhập như bình thường.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 px-5 py-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card/60 px-4 text-sm font-semibold text-foreground hover:border-[var(--gold)]/60 sm:h-10"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Tiếp tục không đăng nhập
          </button>
          <Link
            to="/dang-nhap"
            onClick={() => {
              try { localStorage.removeItem("mw_cookie_consent"); } catch { /* ignore */ }
              onClose();
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--gold)] px-5 text-sm font-semibold text-[var(--gold-foreground)] shadow-[0_10px_28px_-12px_color-mix(in_oklab,var(--gold)_70%,transparent)] hover:-translate-y-0.5 transition-transform sm:h-10"
          >
            Đồng ý &amp; đăng nhập lại
          </Link>
        </div>
      </div>
    </div>
  );
}
