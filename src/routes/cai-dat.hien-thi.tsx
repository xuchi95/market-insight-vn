import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ChevronLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Switch } from "@/components/ui/switch";
import { useMotionPref } from "@/hooks/useMotionPref";

const TITLE = "Tuỳ chọn hiển thị — MarketWatch";
const DESC = "Bật/tắt hiệu ứng flash và tween khi giá thay đổi để giảm giật trên thiết bị yếu.";

export const Route = createFileRoute("/cai-dat/hien-thi")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DisplaySettingsPage,
});

function DisplaySettingsPage() {
  const { animate, setAnimate } = useMotionPref();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <span className="mx-2 opacity-50">/</span>
          <Link to="/cai-dat" className="hover:text-foreground">Cài đặt</Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">Hiển thị</span>
        </nav>

        <header className="mb-8 flex items-start gap-3">
          <Link
            to="/cai-dat"
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-3xl tracking-tight">Tuỳ chọn hiển thị</h1>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-muted text-[var(--gold)]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-4">
                <div className="font-medium">Hiệu ứng nhảy giá</div>
                <Switch
                  checked={animate}
                  onCheckedChange={setAnimate}
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Bật flash màu xanh/đỏ và tween mượt khi giá cập nhật. Tắt nếu bạn cảm thấy giật trên thiết bị yếu — số sẽ đổi ngay không hiệu ứng.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Trạng thái hiện tại:{" "}
                <span className="font-medium text-foreground/80">
                  {animate ? "Đang bật" : "Đã tắt"}
                </span>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}