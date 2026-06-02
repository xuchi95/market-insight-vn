import { Link } from "@tanstack/react-router";
import { TrendingUp, ShieldCheck, BellRing, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}

const TICKER = [
  { sym: "SJC", val: "84.20", chg: "+0.42%", up: true },
  { sym: "BTC", val: "97,420", chg: "+1.81%", up: true },
  { sym: "ETH", val: "3,412", chg: "−0.62%", up: false },
  { sym: "USD", val: "25,460", chg: "+0.08%", up: true },
  { sym: "XAU", val: "2,680", chg: "+0.31%", up: true },
];

const FEATURES = [
  { icon: BellRing, title: "Cảnh báo giá qua email", desc: "Đặt ngưỡng SJC, BTC, USD — chúng tôi gửi ngay khi chạm." },
  { icon: TrendingUp, title: "Dashboard realtime", desc: "Vàng, crypto, tỷ giá cập nhật liên tục, biểu đồ chuyên sâu." },
  { icon: ShieldCheck, title: "Bảo mật chuẩn ngân hàng", desc: "Mã hóa đầu cuối, không bao giờ chia sẻ dữ liệu cá nhân." },
];

export function AuthShell({ eyebrow, title, subtitle, footer, children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* ambient layers */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-[color-mix(in_oklab,var(--gold)_18%,transparent)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1400px] grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* LEFT — editorial */}
        <aside className="relative hidden lg:flex flex-col justify-between border-r border-border/70 px-12 py-10 xl:px-16">
          <header className="flex items-center justify-between">
            <Link to="/" className="group inline-flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-gold-gradient text-[var(--gold-foreground)] font-display text-lg leading-none shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--gold)_60%,transparent)]">
                M
              </span>
              <span className="font-display text-xl tracking-tight">MarketWatch</span>
            </Link>
            <span className="eyebrow">Vietnam · Financial Desk</span>
          </header>

          <div className="my-12 max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] px-3 py-1 text-xs font-medium text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </div>
            <h2 className="font-display text-[42px] xl:text-[52px] leading-[1.05] tracking-tight">
              Đọc thị trường <span className="text-gold italic">như một biên tập viên</span>, hành động như một trader.
            </h2>
            <p className="mt-5 text-base text-muted-foreground max-w-md">
              Bản tin sáng, cảnh báo giá realtime và bảng dữ liệu chuyên sâu — tất cả trong một tài khoản MarketWatch.
            </p>

            <ul className="mt-10 space-y-5">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gold/25 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] text-gold">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-foreground">{f.title}</div>
                    <div className="text-sm text-muted-foreground">{f.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ticker tape */}
          <div className="relative">
            <div className="hairline mb-4" />
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
              <span>Live Tape · Phiên đang mở</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--up)] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--up)]" />
                </span>
                Realtime
              </span>
            </div>
            <div className="grid grid-cols-5 gap-px overflow-hidden rounded-lg border border-border bg-border">
              {TICKER.map((t) => (
                <div key={t.sym} className="bg-card px-3 py-3">
                  <div className="text-xs font-semibold tracking-widest text-muted-foreground">{t.sym}</div>
                  <div className="mt-1 font-mono text-sm font-semibold tabular">{t.val}</div>
                  <div className={`mt-0.5 font-mono text-xs tabular ${t.up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>{t.chg}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* RIGHT — form */}
        <section className="relative flex flex-col px-5 py-8 sm:px-10 lg:px-14 lg:py-14">
          {/* mobile brand */}
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-gold-gradient text-[var(--gold-foreground)] font-display text-base leading-none">M</span>
              <span className="font-display text-lg tracking-tight">MarketWatch</span>
            </Link>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Về trang chủ</Link>
          </div>

          <div className="m-auto w-full max-w-[440px]">
            <div className="hidden lg:flex items-center justify-end mb-8">
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Về trang chủ</Link>
            </div>

            <div className="mb-8">
              <div className="eyebrow mb-3">{eyebrow}</div>
              <h1 className="font-display text-4xl leading-tight tracking-tight">{title}</h1>
              <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <div className="relative rounded-2xl border border-border bg-card/80 p-6 sm:p-8 shadow-[0_24px_60px_-30px_color-mix(in_oklab,var(--gold)_30%,transparent)] backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
              {children}
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>

            <p className="mt-10 text-center text-sm leading-relaxed text-muted-foreground/80">
              Bằng cách tiếp tục, bạn đồng ý với{" "}
              <Link to="/dieu-khoan-su-dung" className="underline underline-offset-2 hover:text-foreground">Điều khoản</Link>{" "}
              và{" "}
              <Link to="/chinh-sach-bao-mat" className="underline underline-offset-2 hover:text-foreground">Chính sách bảo mật</Link>{" "}
              của MarketWatch.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function GoogleButton({ onClick, disabled, loading, label }: { onClick: () => void; disabled?: boolean; loading?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="group relative inline-flex w-full items-center justify-center gap-3 rounded-lg border border-gold/30 bg-transparent px-4 py-3 text-[15px] font-medium tracking-tight text-gold transition-all duration-300 hover:border-gold/60 hover:bg-[color-mix(in_oklab,var(--gold)_5%,transparent)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <svg className="h-5 w-5 animate-spin text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" aria-hidden fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )}
      <span>{loading ? "Đang xử lý…" : label}</span>
    </button>
  );
}

export function Divider({ text = "hoặc" }: { text?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      {text}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}