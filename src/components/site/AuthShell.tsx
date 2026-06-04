import { Link } from "@tanstack/react-router";
import {
  TrendingUp,
  ShieldCheck,
  BellRing,
  Sparkles,
  LineChart,
  Star,
  Briefcase,
  ArrowLeftRight,
  Calculator,
  CalendarDays,
  Newspaper,
  KeyRound,
} from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  footer: ReactNode;
  children: ReactNode;
}

const FEATURES = [
  { icon: TrendingUp, title: "Bảng giá cập nhật từng giây", desc: "Vàng SJC, USD, Bitcoin, chứng khoán — xem nhanh trong một màn hình." },
  { icon: LineChart, title: "Biểu đồ chuyên sâu", desc: "Nến thời gian thực, chỉ báo kỹ thuật và công cụ vẽ như dân trong nghề." },
  { icon: BellRing, title: "Báo giá qua email", desc: "Đặt ngưỡng cho SJC, Bitcoin hay USD — chạm giá là email tới ngay." },
  { icon: Star, title: "Danh sách theo dõi riêng", desc: "Ghim những mã bạn quan tâm để mở ra là thấy, khỏi tìm khắp nơi." },
  { icon: Briefcase, title: "Quản lý danh mục", desc: "Theo dõi lãi lỗ cả vàng, crypto, cổ phiếu trong cùng một chỗ." },
  { icon: Calculator, title: "Công cụ tính toán", desc: "Tính DCA, lãi kép, lãi suất tiết kiệm — gọn gàng, dễ dùng." },
  { icon: ArrowLeftRight, title: "Quy đổi tiền tệ", desc: "Tỷ giá ngân hàng và chợ đen, cập nhật mỗi ngày." },
  { icon: CalendarDays, title: "Lịch sự kiện kinh tế", desc: "Tin vĩ mô trong nước và thế giới có thể ảnh hưởng tới thị trường." },
  { icon: Newspaper, title: "Bản tin sáng mỗi ngày", desc: "Tóm tắt phiên giao dịch quan trọng, gửi tới hộp thư mỗi sáng." },
  { icon: KeyRound, title: "Bảo mật hai lớp", desc: "Đăng nhập bằng Magic Link hoặc mã OTP — an tâm như ở ngân hàng." },
  { icon: ShieldCheck, title: "Dữ liệu của riêng bạn", desc: "Chúng tôi không bán, không chia sẻ thông tin cá nhân cho bên thứ ba." },
  { icon: Sparkles, title: "Miễn phí trọn gói", desc: "Tất cả tính năng dành cho thành viên — không phí ẩn, không nâng cấp." },
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
          </header>

          <div className="my-10 max-w-xl">
            {eyebrow ? (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] px-3 py-1 text-xs font-medium text-gold">
                <Sparkles className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
            ) : null}
            <h2 className="font-display text-[38px] xl:text-[46px] leading-[1.05] tracking-tight">
              Theo dõi thị trường <span className="text-gold italic">gọn trong một chỗ</span>, đỡ phải mở chục tab.
            </h2>
            <p className="mt-4 text-[15px] text-muted-foreground max-w-md">
              Giá vàng, tỷ giá, crypto, lãi suất ngân hàng — cập nhật liên tục. Đặt cảnh báo khi giá chạm ngưỡng, nhận bản tin sáng qua email.
            </p>
          </div>

          {/* Features grid — mọi tính năng hữu ích */}
          <div className="relative">
            <div className="hairline mb-5" />
            <div className="mb-5">
              <div className="font-display text-[20px] tracking-tight text-foreground">Đăng ký một lần, dùng cả bộ</div>
              <p className="mt-1 text-[13px] text-muted-foreground">Những thứ bạn sẽ có ngay sau khi tạo tài khoản miễn phí.</p>
            </div>
            <ul className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-3.5">
              {FEATURES.map((f) => (
                <li key={f.title} className="group flex gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md text-gold/90">
                    <f.icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1 pb-3.5 border-b border-border/50 group-last:border-b-0 xl:[&:nth-last-child(-n+2)]:border-b-0">
                    <div className="text-[13.5px] font-medium text-foreground leading-tight">
                      {f.title}
                    </div>
                    <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{f.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* RIGHT — form */}
        <section className="relative flex flex-col px-5 py-8 sm:px-10 lg:px-14 lg:py-14">
          {/* ambient background — subtle, won't wash out the form */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_60%),radial-gradient(ellipse_at_bottom_left,color-mix(in_oklab,var(--gold)_6%,transparent),transparent_55%)]" />
            <div className="absolute inset-0 bg-grid opacity-[0.06] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
            <div className="absolute -top-24 -right-24 h-[360px] w-[360px] rounded-full bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] blur-3xl" />
            <div className="absolute -bottom-32 -left-16 h-[320px] w-[320px] rounded-full bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] blur-3xl" />
          </div>
          <div className="relative flex flex-1 flex-col">
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
              {eyebrow ? <div className="eyebrow mb-3">{eyebrow}</div> : null}
              <h1 className="font-display text-4xl leading-tight tracking-tight">{title}</h1>
              {subtitle ? <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p> : null}
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