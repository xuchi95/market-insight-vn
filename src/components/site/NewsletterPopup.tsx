import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { NewsletterForm } from "./NewsletterForm";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { getActivePopups } from "@/lib/admin/popups.functions";
import { useLocation } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const onlyEmail = popup.fields.length === 1 && popup.fields[0].type === "email";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-[var(--gold)]/25 bg-card/95 backdrop-blur-xl sm:max-w-sm overflow-hidden p-0 gap-0 shadow-2xl shadow-[var(--gold)]/10">
        {/* Gold accent glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent"
          style={{ background: `linear-gradient(to right, transparent, ${accentVar}, transparent)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[var(--gold)]/10 blur-3xl"
          style={{ background: `color-mix(in oklab, ${accentVar} 18%, transparent)` }}
        />

        <div className="relative p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-5 animate-fade-in">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card" style={{ borderColor: `color-mix(in oklab, ${accentVar} 30%, transparent)`, color: accentVar }}>
              <Mail className="h-4 w-4" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: accentVar }}>
              MarketWatch
            </span>
          </div>

          <DialogTitle className="font-display text-2xl leading-tight animate-fade-in">
            {popup.title}
          </DialogTitle>
          {popup.subtitle && (
            <DialogDescription className="mt-1.5 text-sm text-muted-foreground animate-fade-in">
              {popup.subtitle}
            </DialogDescription>
          )}
          {popup.body_md && <div className="mt-3 whitespace-pre-wrap text-sm">{popup.body_md}</div>}

          <div className="mt-5 animate-scale-in">
            {onlyEmail ? <NewsletterForm /> : <CustomPopupForm popup={popup} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomPopupForm({ popup }: { popup: ActivePopup }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = values.email?.trim();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: `popup:${popup.slug}`, topics: popup.topics, metadata: values }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      toast.success(popup.success_message);
      try { window.dispatchEvent(new CustomEvent("newsletter:subscribed")); } catch {}
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {popup.fields.map((f) => (
        <Input
          key={f.name}
          type={f.type === "email" ? "email" : "text"}
          required={f.required}
          placeholder={f.placeholder ?? f.label}
          value={values[f.name] ?? ""}
          onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
          className="h-11 border-2 border-border bg-background focus-visible:border-[var(--gold)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/30"
        />
      ))}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "…" : popup.cta_label}</Button>
    </form>
  );
}