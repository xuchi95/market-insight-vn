import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail, Bell, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { getActivePopups } from "@/lib/admin/popups.functions";
import { useLocation, Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const KEY_SUBSCRIBED = "mw_nl_subscribed";
const KEY_LAST_SHOWN_PREFIX = "mw_nl_last_shown:";
const KEY_COOKIE_CONSENT = "mw_cookie_consent";

function hasCookieConsent() {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem(KEY_COOKIE_CONSENT);
  } catch {
    return false;
  }
}

type PopupField = { name: string; label: string; type: "email" | "text" | "select"; required: boolean; placeholder?: string };
type PopupTheme = { accent: "gold" | "primary" | "down" | "up"; layout: "center" | "bottom" | "side"; animation: "fade" | "slide" | "pop" };
type PopupTargeting = { pages: string[]; delaySeconds: number; scrollPercent: number; frequencyDays: number; hideForSubscribers: boolean };
type ActivePopup = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  body_md: string | null;
  cta_label: string;
  success_message: string;
  theme: PopupTheme;
  fields: PopupField[];
  targeting: PopupTargeting;
  topics: string[];
};

function pathMatches(pattern: string, path: string) {
  if (pattern === "*" || pattern === "/*") return true;
  if (pattern.endsWith("/*")) return path.startsWith(pattern.slice(0, -2));
  return pattern === path;
}

export function NewsletterPopup() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [popup, setPopup] = useState<ActivePopup | null>(null);
  const [consentReady, setConsentReady] = useState<boolean>(() => hasCookieConsent());
  const fetchPopups = useServerFn(getActivePopups);

  useEffect(() => {
    let cancelled = false;
    fetchPopups()
      .then((res) => {
        if (cancelled) return;
        const path = location.pathname;
        const match = (res.popups as ActivePopup[]).find((p) =>
          (p.targeting?.pages ?? ["*"]).some((pat) => pathMatches(pat, path)),
        );
        setPopup(match ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [fetchPopups, location.pathname]);

  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return;
    if (!popup) return;
    // Mutually exclusive with the cookie consent banner — wait until consent saved.
    if (!consentReady) return;
    try {
      const t = popup.targeting;
      if (t.hideForSubscribers && localStorage.getItem(KEY_SUBSCRIBED) === "1") return;
      const key = KEY_LAST_SHOWN_PREFIX + popup.slug;
      const lastShown = Number(localStorage.getItem(key) || 0);
      const cooldown = (t.frequencyDays ?? 1) * 24 * 3600 * 1000;
      const now = Date.now();
      if (lastShown && now - lastShown < cooldown) return;
      const delay = (t.delaySeconds ?? 25) * 1000;
      const timer = setTimeout(() => setOpen(true), delay);
      return () => clearTimeout(timer);
    } catch {}
  }, [loading, user, popup, consentReady]);

  // Sync with cookie consent banner: never show together.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onConsent = () => setConsentReady(true);
    const onCookieSettingsOpen = () => setOpen(false);
    window.addEventListener("mw:cookie-consent", onConsent);
    window.addEventListener("mw:open-cookie-settings", onCookieSettingsOpen);
    return () => {
      window.removeEventListener("mw:cookie-consent", onConsent);
      window.removeEventListener("mw:open-cookie-settings", onCookieSettingsOpen);
    };
  }, []);

  function handleOpenChange(next: boolean) {
    // Block opening if cookie banner is active (no consent yet).
    if (next && !hasCookieConsent()) {
      setOpen(false);
      return;
    }
    setOpen(next);
    if (!next && popup) {
      try {
        localStorage.setItem(KEY_LAST_SHOWN_PREFIX + popup.slug, String(Date.now()));
      } catch {}
    }
  }

  // Listen for successful subscribe via custom event from NewsletterForm
  useEffect(() => {
    function onSubscribed() {
      try {
        localStorage.setItem(KEY_SUBSCRIBED, "1");
      } catch {}
      setOpen(false);
    }
    window.addEventListener("newsletter:subscribed", onSubscribed);
    return () => window.removeEventListener("newsletter:subscribed", onSubscribed);
  }, []);

  // Render with DB-driven content when a popup matched; otherwise nothing.
  if (!popup) return null;

  const accentVar =
    popup.theme.accent === "primary" ? "var(--primary)" :
    popup.theme.accent === "up" ? "var(--up)" :
    popup.theme.accent === "down" ? "var(--down)" :
    "var(--gold)";
  const accentFg =
    popup.theme.accent === "primary" ? "var(--primary-foreground)" :
    popup.theme.accent === "gold" ? "var(--gold-foreground)" :
    "var(--background)";
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-[var(--gold)]/30 bg-card/95 backdrop-blur-xl sm:max-w-md overflow-hidden p-0 gap-0 shadow-2xl shadow-[var(--gold)]/10 rounded-2xl transition-colors duration-300">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-px h-px transition-[background] duration-300"
          style={{ background: `linear-gradient(to right, transparent, ${accentVar}, transparent)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl transition-[background] duration-300"
          style={{ background: `color-mix(in oklab, ${accentVar} 18%, transparent)` }}
        />

        <div className="relative px-7 pt-8 pb-7 text-center">
          <div className="mx-auto mb-5 relative inline-flex animate-fade-in group">
            <span
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors duration-300 group-hover:scale-[1.03] motion-safe:transition-transform"
              style={{
                borderColor: `color-mix(in oklab, ${accentVar} 40%, transparent)`,
                color: accentVar,
                background: `color-mix(in oklab, ${accentVar} 8%, transparent)`,
              }}
            >
              <Mail className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <span
              className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-card transition-colors duration-300"
              style={{ background: accentVar, color: accentFg }}
            >
              <Bell className="h-3 w-3" strokeWidth={2.5} />
            </span>
          </div>

          <DialogTitle className="font-display text-2xl leading-tight animate-fade-in transition-colors duration-300">
            Đăng ký nhận bản tin
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground animate-fade-in max-w-xs mx-auto transition-colors duration-300">
            Nhận cập nhật giá vàng, crypto, tỷ giá và tin tức tài chính nổi bật mỗi ngày.
          </DialogDescription>

          <div className="mt-6 animate-scale-in">
            <PopupSubscribeForm popup={popup} accentVar={accentVar} accentFg={accentFg} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PopupSubscribeForm({ popup, accentVar, accentFg }: { popup: ActivePopup; accentVar: string; accentFg: string }) {
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Auto-dismiss error after 6s so it doesn't linger across new attempts.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => {
      if (mountedRef.current) setError(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // guard double submit
    setError(null);
    const value = email.trim();
    if (!value) {
      setError("Vui lòng nhập email.");
      return;
    }
    // basic email shape check before flipping loading on
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Email không hợp lệ.");
      return;
    }
    if (!agree) {
      setError("Vui lòng đồng ý nhận email và chính sách bảo mật.");
      return;
    }
    // Cancel any in-flight previous request before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source: `popup:${popup.slug}`, topics: popup.topics }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      if (!mountedRef.current) return;
      setError(null);
      toast.success(popup.success_message || "Đăng ký thành công");
      try { window.dispatchEvent(new CustomEvent("newsletter:subscribed")); } catch {}
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      if (!mountedRef.current) return;
      const msg = (err as Error).message || "Có lỗi xảy ra, vui lòng thử lại.";
      setError(msg);
      toast.error(msg);
    } finally {
      if (mountedRef.current && abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-left">
      <div className="relative group">
        <Mail
          aria-hidden
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
            error ? "text-destructive" : "text-muted-foreground group-focus-within:text-[var(--ring)]"
          }`}
          style={!error ? { color: undefined } : undefined}
        />
        <Input
          type="email"
          required
          placeholder="Nhập email của bạn"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
          aria-invalid={!!error}
          className={`h-12 pl-10 border-2 bg-background/60 transition-colors duration-300 focus-visible:ring-2 ${
            error
              ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
              : "border-border focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/30"
          }`}
        />
        {error && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive animate-fade-in">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 text-base font-semibold transition-[filter,background,color] duration-200 hover:brightness-110 active:brightness-95 disabled:opacity-70 disabled:cursor-not-allowed"
        style={{ background: accentVar, color: accentFg }}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang gửi…
          </span>
        ) : (
          "Đăng ký ngay"
        )}
      </Button>
      <p className="text-center text-xs font-medium transition-colors duration-300" style={{ color: accentVar }}>
        Miễn phí • Có thể hủy bất kỳ lúc nào
      </p>
      <label className="flex items-start justify-center gap-2 text-xs text-muted-foreground cursor-pointer transition-colors duration-300 hover:text-foreground">
        <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
        <span>
          Tôi đồng ý nhận email cập nhật và chấp nhận{" "}
          <Link to="/chinh-sach-bao-mat" className="underline underline-offset-2 transition-opacity duration-200 hover:opacity-80" style={{ color: accentVar }}>
            Chính sách bảo mật
          </Link>
          .
        </span>
      </label>
    </form>
  );
}