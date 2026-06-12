import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { KeyRound, ShieldCheck, Mail, ChevronRight, AtSign, Sparkles, Bell } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/hooks/useAuth";

const TITLE = "Cài đặt tài khoản — MarketWatch";
const DESC = "Quản lý mật khẩu, bảo mật 2 lớp (TOTP, SMS) và đăng ký bản tin MarketWatch.";
const URL = "https://marketwatch.vn/cai-dat";

export const Route = createFileRoute("/cai-dat/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { property: "og:url", content: URL },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SettingsHubPage,
});

function SettingsHubPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/dang-nhap", replace: true });
  }, [loading, user, navigate]);

  const items = [
    {
      to: "/cai-dat/mat-khau" as const,
      icon: KeyRound,
      title: "Đổi mật khẩu",
      desc: "Cập nhật mật khẩu đăng nhập của bạn.",
    },
    {
      to: "/cai-dat/email" as const,
      icon: AtSign,
      title: "Đổi email",
      desc: "Cập nhật địa chỉ email đăng nhập của tài khoản.",
    },
    {
      to: "/cai-dat/bao-mat" as const,
      icon: ShieldCheck,
      title: "Bảo mật 2 lớp (OTP)",
      desc: "Bật/tắt xác thực 2 lớp qua ứng dụng (TOTP) hoặc SMS.",
    },
    {
      to: "/cai-dat/ban-tin" as const,
      icon: Mail,
      title: "Bản tin email",
      desc: "Quản lý chủ đề & tần suất nhận bản tin thị trường.",
    },
    {
      to: "/cai-dat/thong-bao" as const,
      icon: Bell,
      title: "Thông báo push",
      desc: "Chọn loại tài sản (vàng, crypto, ngoại tệ) và khung giờ nhận push.",
    },
    {
      to: "/cai-dat/hien-thi" as const,
      icon: Sparkles,
      title: "Hiển thị",
      desc: "Bật/tắt hiệu ứng flash và tween khi giá thay đổi.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">Cài đặt</span>
        </nav>

        <header className="mb-8">
          <h1 className="font-display text-3xl tracking-tight">Cài đặt tài khoản</h1>
          {user?.email && (
            <p className="mt-1 text-xs text-muted-foreground">
              Đang đăng nhập: <span className="font-medium text-foreground/80">{user.email}</span>
            </p>
          )}
        </header>

        <ul className="grid gap-3">
          {items.map((it) => (
            <li key={it.to}>
              <Link
                to={it.to}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-[var(--gold)]/60 hover:bg-card/80"
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-muted text-[var(--gold)]">
                  <it.icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="font-medium">{it.title}</div>
                  <div className="text-sm text-muted-foreground">{it.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}