import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/site/AuthShell";
import { Loader2, MailCheck } from "lucide-react";

const TITLE = "Quên mật khẩu — MarketWatch";
const DESC = "Nhập email tài khoản MarketWatch để nhận link đặt lại mật khẩu an toàn.";
const URL = "https://marketwatch.vn/quen-mat-khau";

export const Route = createFileRoute("/quen-mat-khau")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Email không hợp lệ");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/dat-lai-mat-khau`,
    });
    setLoading(false);
    if (error) {
      toast.error("Không gửi được email", { description: error.message });
      return;
    }
    // Always show success to avoid leaking which emails exist
    setSent(true);
  }

  return (
    <AuthShell
      eyebrow="Khôi phục tài khoản"
      title={<>Quên <span className="italic text-gold">mật khẩu</span>?</>}
      subtitle="Nhập email đăng ký — chúng tôi sẽ gửi cho bạn một liên kết đặt lại mật khẩu có hiệu lực trong 60 phút."
      footer={<>Nhớ ra mật khẩu rồi?{" "}<Link to="/dang-nhap" className="font-medium text-foreground underline-offset-4 hover:underline">Quay lại đăng nhập</Link></>}
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-gold/30 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] text-gold">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-medium">Đã gửi liên kết</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Nếu <span className="text-foreground">{email}</span> trùng với một tài khoản, bạn sẽ nhận được email kèm link đặt lại mật khẩu trong ít phút. Kiểm tra cả mục spam nếu chưa thấy.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full"
            onClick={() => { setSent(false); setEmail(""); }}
          >
            Gửi cho email khác
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@congty.vn"
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium tracking-wide shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--gold)_70%,transparent)] hover:opacity-95"
          >
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi…</>) : "Gửi liên kết đặt lại"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}