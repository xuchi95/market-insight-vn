import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";

const STORAGE_KEY = "mw_auth_welcome";
const EVENT_NAME = "mw:auth-welcome";

type WelcomeKind = "login" | "signup" | "verified" | "magic_sent";

export interface WelcomePayload {
  kind: WelcomeKind;
  email?: string;
  name?: string;
  description?: string;
}

/** Queue a modern welcome banner to be shown on the next route render. */
export function signalAuthWelcome(payload: WelcomePayload) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    /* noop */
  }
}

function titleFor(kind: WelcomeKind, p: WelcomePayload) {
  switch (kind) {
    case "login":
      return p.name ? `Chào mừng trở lại, ${p.name}` : "Chào mừng trở lại";
    case "signup":
      return "Tài khoản đã được tạo";
    case "verified":
      return "Đã xác minh thành công";
    case "magic_sent":
      return "Đã gửi magic link";
  }
}

function descFor(kind: WelcomeKind, p: WelcomePayload) {
  if (p.description) return p.description;
  switch (kind) {
    case "login":
      return p.email ? `Bạn đã đăng nhập với ${p.email}.` : "Bạn đã đăng nhập thành công.";
    case "signup":
      return "Chào mừng bạn đến với MarketWatch. Bắt đầu theo dõi thị trường ngay.";
    case "verified":
      return "Lớp bảo mật 2 yếu tố đã được xác minh.";
    case "magic_sent":
      return p.email ? `Mở email ${p.email} và bấm vào liên kết để đăng nhập.` : "Kiểm tra hộp thư của bạn.";
  }
}

export function AuthWelcomeBanner() {
  const [payload, setPayload] = useState<WelcomePayload | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideAt: ReturnType<typeof setTimeout> | undefined;
    let unmountAt: ReturnType<typeof setTimeout> | undefined;

    const consume = () => {
      let raw: string | null = null;
      try {
        raw = sessionStorage.getItem(STORAGE_KEY);
      } catch {
        return;
      }
      if (!raw) return;
      try {
        const data = JSON.parse(raw) as WelcomePayload;
        sessionStorage.removeItem(STORAGE_KEY);
        if (hideAt) clearTimeout(hideAt);
        if (unmountAt) clearTimeout(unmountAt);
        setVisible(false);
        setPayload(data);
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        hideAt = setTimeout(() => setVisible(false), 5200);
        unmountAt = setTimeout(() => setPayload(null), 5800);
      } catch {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
      }
    };

    consume();
    window.addEventListener(EVENT_NAME, consume);
    return () => {
      window.removeEventListener(EVENT_NAME, consume);
      if (hideAt) clearTimeout(hideAt);
      if (unmountAt) clearTimeout(unmountAt);
    };
  }, []);

  if (!payload) return null;

  const title = titleFor(payload.kind, payload);
  const description = descFor(payload.kind, payload);
  const Icon = payload.kind === "signup" ? Sparkles : CheckCircle2;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
      }`}
    >
      <div className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--gold)_35%,transparent)] bg-background/70 p-[1px] shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--gold)_45%,transparent)] backdrop-blur-xl">
        {/* gradient hairline */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[color-mix(in_oklab,var(--gold)_55%,transparent)] via-transparent to-[color-mix(in_oklab,var(--gold)_55%,transparent)] opacity-70" aria-hidden />
        <div className="relative flex items-start gap-3 rounded-[15px] bg-background/85 px-4 py-3.5 backdrop-blur-xl">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]">
            <Icon className="h-5 w-5 text-gold" />
            <span className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-gold/20 blur-md" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <div className="truncate text-sm font-semibold tracking-tight text-foreground">
              {title}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
              {description}
            </div>
            {/* progress bar */}
            <div className="mt-2.5 h-[2px] w-full overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full bg-gold-gradient"
                style={{
                  animation: visible ? "mwAuthWelcomeProgress 5s linear forwards" : undefined,
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <style>{`@keyframes mwAuthWelcomeProgress { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
}