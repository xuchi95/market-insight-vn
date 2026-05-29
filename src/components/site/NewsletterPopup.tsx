import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { NewsletterForm } from "./NewsletterForm";
import { useAuth } from "@/hooks/useAuth";

const KEY_SUBSCRIBED = "mw_nl_subscribed";
const KEY_LAST_SHOWN = "mw_nl_last_shown";
const KEY_DISMISS_COUNT = "mw_nl_dismiss_count";

// Cooldown in ms before showing again after a dismiss
const COOLDOWN_GUEST = 1000 * 60 * 60 * 24 * 1; // 1 day
const COOLDOWN_AUTH = 1000 * 60 * 60 * 24 * 7; // 7 days
const FIRST_DELAY_GUEST = 25_000; // 25s on first visit
const FIRST_DELAY_AUTH = 90_000; // 90s if logged in

export function NewsletterPopup() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(KEY_SUBSCRIBED) === "1") return;
      const lastShown = Number(localStorage.getItem(KEY_LAST_SHOWN) || 0);
      const cooldown = user ? COOLDOWN_AUTH : COOLDOWN_GUEST;
      const now = Date.now();
      if (lastShown && now - lastShown < cooldown) return;
      const delay = user ? FIRST_DELAY_AUTH : FIRST_DELAY_GUEST;
      const t = setTimeout(() => setOpen(true), delay);
      return () => clearTimeout(t);
    } catch {}
  }, [loading, user]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      try {
        localStorage.setItem(KEY_LAST_SHOWN, String(Date.now()));
        const c = Number(localStorage.getItem(KEY_DISMISS_COUNT) || 0) + 1;
        localStorage.setItem(KEY_DISMISS_COUNT, String(c));
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-[var(--gold)]/25 bg-card/95 backdrop-blur-xl sm:max-w-sm overflow-hidden p-0 gap-0 shadow-2xl shadow-[var(--gold)]/10">
        {/* Gold accent glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[var(--gold)]/10 blur-3xl"
        />

        <div className="relative p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-5 animate-fade-in">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/5 text-[var(--gold)]">
              <Mail className="h-4 w-4" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]">
              Bản tin MarketWatch
            </span>
          </div>

          <DialogTitle className="font-display text-2xl leading-tight animate-fade-in">
            Thị trường <span className="italic text-[var(--gold)]">mỗi sáng</span>.
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-muted-foreground animate-fade-in">
            Vàng · Crypto · Ngoại tệ — gói gọn trong 1 email.
          </DialogDescription>

          <div className="mt-5 animate-scale-in">
            <NewsletterForm />
          </div>

          <p className="mt-3 text-xs text-muted-foreground/80">
            Miễn phí · Huỷ bất cứ lúc nào.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}