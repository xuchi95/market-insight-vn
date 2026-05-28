import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
      <DialogContent className="border-[var(--gold)]/30 bg-card sm:max-w-md overflow-hidden">
        <DialogHeader>
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--gold)]">
            Bản tin MarketWatch
          </div>
          <DialogTitle className="font-display text-2xl">Đừng bỏ lỡ biến động thị trường</DialogTitle>
          <DialogDescription className="text-sm">
            Đăng ký nhận tổng hợp ngắn gọn về vàng, crypto và ngoại tệ — gửi trực tiếp vào hộp thư mỗi sáng.
          </DialogDescription>
        </DialogHeader>
        <div>
          <NewsletterForm />
          <p className="mt-3 text-sm text-muted-foreground">
            Miễn phí. Bạn có thể huỷ đăng ký bất cứ lúc nào.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}