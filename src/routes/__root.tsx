import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { NumberFormatProvider } from "@/hooks/useNumberFormat";
import { Toaster } from "@/components/ui/sonner";
import { NewsletterPopup } from "@/components/site/NewsletterPopup";
import { AuthWelcomeBanner } from "@/components/site/AuthWelcomeBanner";

function NotFoundComponent() {
  const ctaBase =
    "group inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-all duration-200 ease-out will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--gold)_60%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const fallbackFont = '"Be Vietnam Pro", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const fallbackDisplayFont = '"DM Serif Display", Georgia, "Times New Roman", serif';

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-16"
      style={{
        position: "relative",
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--background, #0d0d0d)",
        color: "var(--foreground, #f5f0df)",
        padding: "4rem 1.25rem",
        fontFamily: fallbackFont,
      }}
    >
      {/* Ambient gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          opacity: 0.6,
          background:
            "radial-gradient(60% 50% at 50% 35%, color-mix(in oklab, var(--gold, #c9a84c) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid opacity-[0.06]"
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--border, #4c463a) 60%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border, #4c463a) 60%, transparent) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto w-full max-w-3xl" style={{ position: "relative", width: "100%", maxWidth: "48rem", margin: "0 auto" }}>
        {/* 404 ticker */}
        <div className="text-center" style={{ textAlign: "center" }}>
          <div className="font-display leading-none tracking-tight" style={{ fontFamily: fallbackDisplayFont, lineHeight: 1 }}>
            <span
              className="block bg-gradient-to-b from-[var(--gold-light)] via-[var(--gold)] to-[color-mix(in_oklab,var(--gold)_40%,var(--background))] bg-clip-text text-[clamp(7rem,22vw,15rem)] text-transparent drop-shadow-[0_2px_30px_color-mix(in_oklab,var(--gold)_25%,transparent)]"
              style={{
                display: "block",
                fontSize: "clamp(7rem, 22vw, 15rem)",
                lineHeight: 0.9,
                background: "linear-gradient(to bottom, var(--gold-light, #f0d78c), var(--gold, #c9a84c), color-mix(in oklab, var(--gold, #c9a84c) 40%, var(--background, #0d0d0d)))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 30px color-mix(in oklab, var(--gold, #c9a84c) 25%, transparent))",
              }}
            >
              404
            </span>
          </div>

          <div className="mx-auto mt-4 flex items-center justify-center gap-3" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", margin: "1rem auto 0" }}>
            <span className="h-px w-10 bg-[color-mix(in_oklab,var(--gold)_50%,transparent)]" style={{ display: "block", width: "2.5rem", height: 1, background: "color-mix(in oklab, var(--gold, #c9a84c) 50%, transparent)" }} />
            <span className="eyebrow !text-[var(--gold)]" style={{ color: "var(--gold, #c9a84c)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em" }}>Mã phiên không tồn tại</span>
            <span className="h-px w-10 bg-[color-mix(in_oklab,var(--gold)_50%,transparent)]" style={{ display: "block", width: "2.5rem", height: 1, background: "color-mix(in oklab, var(--gold, #c9a84c) 50%, transparent)" }} />
          </div>

          <h1 className="mt-6 font-display text-3xl md:text-4xl text-foreground" style={{ margin: "1.5rem 0 0", color: "var(--foreground, #f5f0df)", fontFamily: fallbackFont, fontSize: "clamp(1.875rem, 3vw, 2.25rem)", fontWeight: 600, lineHeight: 1.2 }}>
            Trang bạn tìm đã ngừng niêm yết
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground" style={{ maxWidth: "36rem", margin: "0.75rem auto 0", color: "var(--muted-foreground, #c8b98f)", fontSize: "1rem", lineHeight: 1.7 }}>
            Có vẻ như đường dẫn này đã bị huỷ niêm yết, đổi mã hoặc chưa từng được phát hành. Hãy quay về trang chủ để tiếp tục theo dõi thị trường.
          </p>
        </div>

        {/* Mini quote card */}
        <div className="mx-auto mt-8 grid max-w-xl grid-cols-3 overflow-hidden rounded-lg border border-border bg-card/60 backdrop-blur-sm shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_15%,transparent)]" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", maxWidth: "36rem", margin: "2rem auto 0", overflow: "hidden", border: "1px solid var(--border, #4c463a)", borderRadius: "0.5rem", background: "color-mix(in oklab, var(--card, #1a1a1a) 60%, transparent)", boxShadow: "0 0 0 1px color-mix(in oklab, var(--gold, #c9a84c) 15%, transparent)" }}>
          <div className="border-r border-border px-4 py-3 text-center" style={{ padding: "0.75rem 1rem", textAlign: "center", borderRight: "1px solid var(--border, #4c463a)" }}>
            <div className="eyebrow opacity-70" style={{ color: "var(--gold, #c9a84c)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", opacity: 0.7 }}>Mã</div>
            <div className="mt-1 font-mono text-sm text-foreground" style={{ marginTop: "0.25rem", color: "var(--foreground, #f5f0df)", fontFamily: fallbackFont, fontSize: "0.875rem", fontVariantNumeric: "tabular-nums" }}>MWT/404</div>
          </div>
          <div className="border-r border-border px-4 py-3 text-center" style={{ padding: "0.75rem 1rem", textAlign: "center", borderRight: "1px solid var(--border, #4c463a)" }}>
            <div className="eyebrow opacity-70" style={{ color: "var(--gold, #c9a84c)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", opacity: 0.7 }}>Giá</div>
            <div className="mt-1 font-mono text-sm text-[var(--down)]" style={{ marginTop: "0.25rem", color: "var(--down, #e85d3a)", fontFamily: fallbackFont, fontSize: "0.875rem", fontVariantNumeric: "tabular-nums" }}>— —</div>
          </div>
          <div className="px-4 py-3 text-center" style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
            <div className="eyebrow opacity-70" style={{ color: "var(--gold, #c9a84c)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", opacity: 0.7 }}>Biến động</div>
            <div className="mt-1 font-mono text-sm text-[var(--down)]" style={{ marginTop: "0.25rem", color: "var(--down, #e85d3a)", fontFamily: fallbackFont, fontSize: "0.875rem", fontVariantNumeric: "tabular-nums" }}>−100,00%</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginTop: "2rem" }}>
          <Link
            to="/"
            preload="intent"
            className={`${ctaBase} bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] font-semibold text-[var(--gold-foreground)] shadow-[0_8px_30px_-10px_color-mix(in_oklab,var(--gold)_60%,transparent)] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-12px_color-mix(in_oklab,var(--gold)_75%,transparent)] active:translate-y-0 active:shadow-[0_4px_14px_-6px_color-mix(in_oklab,var(--gold)_60%,transparent)]`}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", minHeight: "2.5rem", padding: "0.625rem 1.25rem", borderRadius: "0.375rem", background: "linear-gradient(to right, var(--gold-light, #f0d78c), var(--gold, #c9a84c))", color: "var(--gold-foreground, #0d0d0d)", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 30px -10px color-mix(in oklab, var(--gold, #c9a84c) 60%, transparent)" }}
          >
            <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            Về trang chủ
          </Link>
          <Link
            to="/gia-vang"
            preload="intent"
            className={`${ctaBase} border border-border bg-card/50 text-foreground hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--gold)_55%,transparent)] hover:bg-[color-mix(in_oklab,var(--gold)_8%,var(--card))] hover:text-[var(--gold)] hover:shadow-[0_10px_28px_-14px_color-mix(in_oklab,var(--gold)_60%,transparent)] active:translate-y-0`}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", minHeight: "2.5rem", padding: "0.625rem 1.25rem", borderRadius: "0.375rem", border: "1px solid var(--border, #4c463a)", background: "color-mix(in oklab, var(--card, #1a1a1a) 50%, transparent)", color: "var(--foreground, #f5f0df)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] transition-transform duration-200 group-hover:scale-125" style={{ display: "inline-block", width: "0.375rem", height: "0.375rem", borderRadius: 999, background: "var(--gold, #c9a84c)" }} />
            Xem giá vàng
          </Link>
          <Link
            to="/tien-dien-tu"
            preload="intent"
            className={`${ctaBase} border border-border bg-card/50 text-foreground hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--gold)_55%,transparent)] hover:bg-[color-mix(in_oklab,var(--gold)_8%,var(--card))] hover:text-[var(--gold)] hover:shadow-[0_10px_28px_-14px_color-mix(in_oklab,var(--gold)_60%,transparent)] active:translate-y-0`}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", minHeight: "2.5rem", padding: "0.625rem 1.25rem", borderRadius: "0.375rem", border: "1px solid var(--border, #4c463a)", background: "color-mix(in oklab, var(--card, #1a1a1a) 50%, transparent)", color: "var(--foreground, #f5f0df)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] transition-transform duration-200 group-hover:scale-125" style={{ display: "inline-block", width: "0.375rem", height: "0.375rem", borderRadius: 999, background: "var(--gold, #c9a84c)" }} />
            Crypto
          </Link>
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center" style={{ marginTop: "2.5rem", textAlign: "center" }}>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60" style={{ color: "color-mix(in oklab, var(--muted-foreground, #c8b98f) 60%, transparent)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Error 404 · Resource not listed · MarketWatch
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MarketWatch — Giá vàng, crypto & ngoại tệ realtime" },
      { name: "description", content: "Dashboard tài chính realtime: giá vàng SJC, DOJI, BTC, ETH, USD và tỷ giá ngoại tệ." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MarketWatch" },
      { property: "og:locale", content: "vi_VN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@MarketWatchVN" },
      { name: "robots", content: "index,follow,max-image-preview:large,max-snippet:-1" },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "author", content: "MarketWatch" },
      { name: "google-site-verification", content: "QM1xHGgwKqlqIn06cikiqkw6uwQ_bvTwhspQhG_5ezI" },
      { property: "og:title", content: "MarketWatch — Giá vàng, crypto & ngoại tệ realtime" },
      { name: "twitter:title", content: "MarketWatch — Giá vàng, crypto & ngoại tệ realtime" },
      { property: "og:description", content: "Dashboard tài chính realtime: giá vàng SJC, DOJI, BTC, ETH, USD và tỷ giá ngoại tệ." },
      { name: "twitter:description", content: "Dashboard tài chính realtime: giá vàng SJC, DOJI, BTC, ETH, USD và tỷ giá ngoại tệ." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b8c9b171-48fc-42a5-b09c-62d699f826fa" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b8c9b171-48fc-42a5-b09c-62d699f826fa" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "MarketWatch",
          url: "https://marketwatch.vn",
          inLanguage: "vi-VN",
          description:
            "Dashboard tài chính tiếng Việt: giá vàng SJC, DOJI, PNJ, Bitcoin, Ethereum, USDT, tỷ giá USD/VND, EUR, JPY, CNY realtime.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "MarketWatch",
          url: "https://marketwatch.vn",
          inLanguage: "vi-VN",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://marketwatch.vn/tai-san/{search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NumberFormatProvider>
            <Outlet />
            <Toaster position="top-right" richColors />
            <NewsletterPopup />
            <AuthWelcomeBanner />
          </NumberFormatProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
