import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BellOff, Check, Loader2 } from "lucide-react";

const SearchSchema = z.object({ token: z.string().optional() });
const TITLE = "Huỷ đăng ký bản tin — MarketWatch";

export const Route = createFileRoute("/huy-ban-tin")({
  validateSearch: (s) => SearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = useSearch({ from: "/huy-ban-tin" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [email, setEmail] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleConfirm() {
    if (!token) return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "expired") {
          setErrMsg(
            "Đường dẫn huỷ đăng ký đã hết hạn (quá 180 ngày). Vui lòng mở email bản tin mới nhất để dùng đường dẫn mới.",
          );
        } else if (data?.error === "not_found") {
          setErrMsg("Đường dẫn không hợp lệ hoặc đã được dùng. Vui lòng dùng đường dẫn trong email mới nhất.");
        } else {
          setErrMsg("Có lỗi xảy ra.");
        }
        setState("error");
        return;
      }
      setEmail(data.email ?? null);
      setState("done");
    } catch {
      setErrMsg("Không thể kết nối máy chủ.");
      setState("error");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-lg px-5 py-16">
        <div className="rounded-2xl border border-border bg-card/40 p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <BellOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl mb-2">Huỷ đăng ký bản tin</h1>

          {!token ? (
            <p className="text-sm text-muted-foreground">
              Đường dẫn không hợp lệ. Vui lòng dùng nút huỷ đăng ký trong email gần nhất.
            </p>
          ) : state === "done" ? (
            <>
              <div className="inline-flex items-center gap-2 text-emerald-500 text-sm font-medium">
                <Check className="h-4 w-4" /> Đã huỷ đăng ký thành công
              </div>
              {email && (
                <p className="text-sm text-muted-foreground mt-2">
                  Địa chỉ <strong className="text-foreground">{email}</strong> sẽ không còn nhận bản tin từ MarketWatch.
                </p>
              )}
              <Link to="/" className="inline-block mt-6 text-sm text-[var(--gold)] hover:underline">
                ← Về trang chủ
              </Link>
            </>
          ) : state === "error" ? (
            <>
              <p className="text-sm text-destructive">{errMsg}</p>
              <Link to="/cai-dat/ban-tin" className="inline-block mt-6 text-sm text-[var(--gold)] hover:underline">
                Mở trang quản lý bản tin →
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Bạn chắc chắn muốn ngừng nhận bản tin tổng hợp vàng, BTC và USD từ MarketWatch?
              </p>
              <Button
                onClick={handleConfirm}
                disabled={state === "loading"}
                variant="destructive"
                className="mt-6"
              >
                {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Xác nhận huỷ đăng ký
              </Button>
              <div className="mt-4">
                <Link to="/cai-dat/ban-tin" className="text-xs text-muted-foreground hover:text-foreground">
                  Tuỳ chỉnh chủ đề thay vì huỷ
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}