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

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
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
          </NumberFormatProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
