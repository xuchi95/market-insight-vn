import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, BellOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { consumeWatchUnsubToken } from "@/lib/watchlist/unsubscribe.functions";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/huy-canh-bao-theo-doi")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Huỷ cảnh báo theo dõi — MarketWatch" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UnsubPage,
});

function UnsubPage() {
  const { token } = useSearch({ from: "/huy-canh-bao-theo-doi" });
  const consume = useServerFn(consumeWatchUnsubToken);
  const [state, setState] = useState<
    | { kind: "idle" | "loading" }
    | { kind: "error"; message: string }
    | { kind: "done"; scope: "item" | "all"; symbol: string | null; alreadyUsed: boolean }
  >({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "Thiếu mã token trong đường dẫn." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await consume({ data: { token } });
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: "error", message: "Token không hợp lệ hoặc đã hết hạn." });
        } else {
          setState({ kind: "done", scope: res.scope as "item" | "all", symbol: res.symbol, alreadyUsed: !!res.alreadyUsed });
        }
      } catch (e: any) {
        if (!cancelled) setState({ kind: "error", message: e?.message || "Có lỗi xảy ra." });
      }
    })();
    return () => { cancelled = true; };
  }, [token, consume]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-xl px-5 py-16">
        <div className="rounded-2xl border border-border bg-card/40 p-8 text-center">
          {state.kind === "loading" ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Đang xử lý yêu cầu huỷ cảnh báo…</p>
            </div>
          ) : state.kind === "error" ? (
            <div className="flex flex-col items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <h1 className="font-display text-2xl">Không thể huỷ cảnh báo</h1>
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <Link to="/cai-dat/canh-bao" className="mt-4 inline-flex items-center gap-1.5 text-sm text-[var(--gold)] hover:underline">
                Mở trang quản lý cảnh báo →
              </Link>
            </div>
          ) : state.kind === "done" ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <h1 className="font-display text-2xl">
                {state.scope === "all"
                  ? "Đã tắt toàn bộ cảnh báo theo dõi"
                  : `Đã tắt cảnh báo cho ${state.symbol?.toUpperCase()}`}
              </h1>
              <p className="text-sm text-muted-foreground max-w-md">
                {state.alreadyUsed
                  ? "Yêu cầu này đã được xử lý trước đó."
                  : state.scope === "all"
                  ? "Bạn sẽ không nhận thêm email cảnh báo biến động cho bất kỳ tài sản nào trong danh sách theo dõi."
                  : "Bạn vẫn tiếp tục nhận cảnh báo cho các tài sản còn lại."}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
                <Link to="/cai-dat/canh-bao" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 hover:border-[var(--gold)]/40">
                  <BellOff className="h-3.5 w-3.5" /> Quản lý cảnh báo
                </Link>
                <Link to="/" className="text-muted-foreground hover:text-foreground">Về trang chủ</Link>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}