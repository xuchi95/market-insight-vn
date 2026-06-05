import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { createElement } from "react";
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
import { MotionPrefProvider } from "@/hooks/useMotionPref";
import { Toaster } from "@/components/ui/sonner";
import { NewsletterPopup } from "@/components/site/NewsletterPopup";
import { AuthWelcomeBanner } from "@/components/site/AuthWelcomeBanner";
import { CookieConsent } from "@/components/site/CookieConsent";
import { getActiveCodeInjections, type PublicInjection } from "@/lib/admin/code-injections.functions";

function NotFoundComponent() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const shortcuts: Array<{ to: string; code: string; label: string; hint: string }> = [
    { to: "/", code: "HOME", label: "Trang chủ", hint: "Bảng tổng hợp realtime" },
    { to: "/gia-vang", code: "XAU", label: "Giá vàng", hint: "SJC · DOJI · PNJ" },
    { to: "/tien-dien-tu", code: "CRYPTO", label: "Crypto", hint: "BTC · ETH · top 100" },
    { to: "/ty-gia-ngoai-te", code: "FX", label: "Ngoại tệ", hint: "USD · EUR · JPY" },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:py-20">
      {/* Ambient gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 30%, color-mix(in oklab, var(--gold, #c9a84c) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      {/* Grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--border) 70%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 70%, transparent) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-3xl">
        {/* Status chip */}
        <div className="mb-6 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--down)_35%,var(--border))] bg-[color-mix(in_oklab,var(--down)_8%,var(--card))] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--down)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--down)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--down)]" />
            </span>
            HALTED · 404
          </div>
        </div>

        {/* Big 404 */}
        <h1 className="text-center font-display leading-none tracking-tight">
          <span
            className="block bg-clip-text text-[clamp(6.5rem,22vw,14rem)] text-transparent"
            style={{
              background:
                "linear-gradient(180deg, var(--gold-light, #f0d78c) 0%, var(--gold, #c9a84c) 55%, color-mix(in oklab, var(--gold, #c9a84c) 25%, var(--background)) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 28px color-mix(in oklab, var(--gold, #c9a84c) 25%, transparent))",
            }}
          >
            404
          </span>
        </h1>

        {/* Subtitle */}
        <div className="mt-4 text-center">
          <h2 className="font-display text-2xl text-foreground sm:text-3xl">
            Trang bạn tìm đã <span className="text-[var(--gold)]">ngừng niêm yết</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            URL này không có trong danh mục của MarketWatch — có thể đã bị huỷ niêm yết,
            đổi mã, hoặc chưa từng phát hành. Quay lại bảng giao dịch để tiếp tục theo dõi thị trường.
          </p>
        </div>

        {/* Terminal quote card */}
        <div className="mx-auto mt-8 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card/70 shadow-[0_30px_80px_-40px_color-mix(in_oklab,var(--gold)_35%,transparent)] backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="text-[var(--gold)]">MWT · Terminal</span>
            <span className="font-mono">{new Date().toLocaleTimeString("vi-VN")}</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="px-4 py-3 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mã</div>
              <div className="mt-1 font-mono text-sm text-foreground">MWT/404</div>
            </div>
            <div className="px-4 py-3 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Giá</div>
              <div className="mt-1 font-mono text-sm text-[var(--down)]">— —</div>
            </div>
            <div className="px-4 py-3 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Biến động</div>
              <div className="mt-1 font-mono text-sm text-[var(--down)]">−100,00%</div>
            </div>
          </div>
          <div className="border-t border-border bg-background/40 px-4 py-2.5">
            <div className="font-mono text-[11px] text-muted-foreground">
              <span className="text-[var(--down)]">›</span>{" "}
              <span className="text-foreground/80">GET</span>{" "}
              <span className="truncate text-[var(--gold)]/90">{path}</span>{" "}
              <span className="text-[var(--down)]">→ 404 Not Found</span>
            </div>
          </div>
        </div>

        {/* Shortcuts grid */}
        <div className="mt-8">
          <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Lối tắt phổ biến
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {shortcuts.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                preload="intent"
                className="group flex flex-col items-start gap-1 rounded-lg border border-border bg-card/50 px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--gold)_55%,transparent)] hover:bg-[color-mix(in_oklab,var(--gold)_8%,var(--card))] hover:shadow-[0_10px_28px_-14px_color-mix(in_oklab,var(--gold)_60%,transparent)]"
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--gold)]">
                  {s.code}
                </span>
                <span className="text-sm font-semibold text-foreground group-hover:text-[var(--gold)]">
                  {s.label}
                </span>
                <span className="text-[11px] text-muted-foreground">{s.hint}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
          Error 404 · Resource not listed · MarketWatch
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
  loader: async () => {
    try {
      const { items } = await getActiveCodeInjections();
      return { injections: items };
    } catch {
      return { injections: [] as PublicInjection[] };
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MarketWatch — Công cụ theo dõi dữ liệu tài chính Việt Nam" },
      { name: "description", content: "Công cụ theo dõi dữ liệu tài chính của Việt Nam; Giá vàng, tiền số và ngoại tệ.... cập nhật theo từng phút." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MarketWatch" },
      { property: "og:locale", content: "vi_VN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@MarketWatchVN" },
      { name: "robots", content: "index,follow,max-image-preview:large,max-snippet:-1" },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "author", content: "MarketWatch" },
      { name: "google-site-verification", content: "QM1xHGgwKqlqIn06cikiqkw6uwQ_bvTwhspQhG_5ezI" },
      { property: "og:title", content: "MarketWatch — Công cụ theo dõi dữ liệu tài chính Việt Nam" },
      { name: "twitter:title", content: "MarketWatch — Công cụ theo dõi dữ liệu tài chính Việt Nam" },
      { property: "og:description", content: "Công cụ theo dõi dữ liệu tài chính của Việt Nam; Giá vàng, tiền số và ngoại tệ.... cập nhật theo từng phút." },
      { name: "twitter:description", content: "Công cụ theo dõi dữ liệu tài chính của Việt Nam; Giá vàng, tiền số và ngoại tệ.... cập nhật theo từng phút." },
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
          "@id": "https://marketwatch.vn/#organization",
          name: "MarketWatch",
          alternateName: ["MarketWatch VN", "MarketWatch Việt Nam"],
          url: "https://marketwatch.vn",
          inLanguage: "vi-VN",
          description:
            "Dashboard tài chính tiếng Việt: giá vàng SJC, DOJI, PNJ, Bitcoin, Ethereum, USDT, tỷ giá USD/VND, EUR, JPY, CNY realtime.",
          logo: {
            "@type": "ImageObject",
            url: "https://marketwatch.vn/favicon.png",
            contentUrl: "https://marketwatch.vn/favicon.png",
            width: 512,
            height: 512,
          },
          image: "https://marketwatch.vn/og-image.png",
          foundingDate: "2024",
          areaServed: { "@type": "Country", name: "Vietnam" },
          knowsAbout: [
            "Giá vàng SJC",
            "Giá Bitcoin",
            "Tỷ giá ngoại tệ",
            "Chứng khoán Việt Nam",
            "Lãi suất ngân hàng",
            "Giá xăng dầu",
          ],
          sameAs: [
            "https://www.facebook.com/marketwatchvn",
            "https://twitter.com/MarketWatchVN",
            "https://www.youtube.com/@marketwatchvn",
            "https://www.linkedin.com/company/marketwatchvn",
            "https://github.com/marketwatchvn",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            url: "https://marketwatch.vn/lien-he",
            availableLanguage: ["Vietnamese", "English"],
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": "https://marketwatch.vn/#website",
          name: "MarketWatch",
          alternateName: "MarketWatch VN",
          url: "https://marketwatch.vn",
          inLanguage: "vi-VN",
          description:
            "Dashboard tài chính realtime: giá vàng, crypto, ngoại tệ, chứng khoán, lãi suất và xăng dầu Việt Nam.",
          publisher: { "@id": "https://marketwatch.vn/#organization" },
          potentialAction: {
            "@type": "SearchAction",
            target: "https://marketwatch.vn/tai-san/{search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      // NOTE: Snippet admin chèn vào <head> được render trong RootShell qua
      // dangerouslySetInnerHTML để giữ nguyên các thẻ <meta>, <link>, <script>
      // — không thể đẩy vào head().scripts vì sẽ bị bọc trong <script>.
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function parseHeadSnippets(html: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match self-closing/void tags (<meta>, <link>) and paired tags (<script>, <style>, <noscript>)
  const re =
    /<(script|style|noscript)\b([^>]*)>([\s\S]*?)<\/\1\s*>|<(meta|link)\b([^>]*?)\/?\s*>/gi;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(html)) !== null) {
    const attrs: Record<string, string | boolean> = {};
    const attrStr = m[2] ?? m[5] ?? "";
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(attrStr)) !== null) {
      const name = am[1];
      const val = am[2] ?? am[3] ?? am[4];
      attrs[name] = val ?? true;
    }
    const tag = (m[1] ?? m[4]).toLowerCase();
    const inner = m[3];
    if (tag === "script" || tag === "style" || tag === "noscript") {
      nodes.push(
        createElement(tag, {
          key: `inj-${key++}`,
          ...attrs,
          dangerouslySetInnerHTML: inner ? { __html: inner } : undefined,
        }),
      );
    } else {
      nodes.push(createElement(tag, { key: `inj-${key++}`, ...attrs }));
    }
  }
  return nodes;
}

function RootShell({ children }: { children: React.ReactNode }) {
  const loaderData = Route.useLoaderData();
  const headInjections = ((loaderData?.injections ?? []) as PublicInjection[])
    .filter((i) => i.location === "head")
    .flatMap((i) => parseHeadSnippets(i.code));
  return (
    <html lang="vi" className="dark">
      <head>
        <style>{`html.dark{--background:#0d0d0d;--foreground:#f5f0df;--card:#1a1a1a;--border:#4c463a;--gold:#c9a84c;--gold-light:#f0d78c;--gold-foreground:#0d0d0d;--muted-foreground:#c8b98f;--down:#e85d3a;color-scheme:dark}html.light{--background:#f3eee4;--foreground:#2a241b;--card:#fbf7ee;--border:#d6cdb8;--gold:#8a6a1f;--gold-light:#b5904a;--gold-foreground:#fbf7ee;--muted-foreground:#5b5240;--down:#c0432a;color-scheme:light}html{background:var(--background)}body{margin:0;background:var(--background);color:var(--foreground);font-family:"Be Vietnam Pro",ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}`}</style>
        <HeadContent />
        {headInjections}
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
  const loaderData = Route.useLoaderData();
  const injections = (loaderData?.injections ?? []) as PublicInjection[];
  const bodyStart = injections.filter((i) => i.location === "body_start");
  const bodyEnd = injections.filter((i) => i.location === "body_end");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NumberFormatProvider>
            <MotionPrefProvider>
              {bodyStart.map((i: PublicInjection, idx: number) => (
                <div key={`bs-${idx}`} dangerouslySetInnerHTML={{ __html: i.code }} />
              ))}
              <Outlet />
              <Toaster position="top-right" richColors />
              <NewsletterPopup />
              <AuthWelcomeBanner />
              <CookieConsent />
              {bodyEnd.map((i: PublicInjection, idx: number) => (
                <div key={`be-${idx}`} dangerouslySetInnerHTML={{ __html: i.code }} />
              ))}
            </MotionPrefProvider>
          </NumberFormatProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
