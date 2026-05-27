import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { sendWelcomeEmail } from "@/lib/email/welcome.functions";
import { AuthShell, GoogleButton, Divider } from "@/components/site/AuthShell";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";

const TITLE = "Đăng ký tài khoản — MarketWatch";
const DESC = "Tạo tài khoản MarketWatch miễn phí để đặt cảnh báo giá vàng và crypto qua email.";
const URL = "https://marketwatch.vn/dang-ky";

export const Route = createFileRoute("/dang-ky")({
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
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() || undefined },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Đăng ký không thành công", { description: error.message });
      return;
    }
    if (data.session) {
      sendWelcomeEmail().catch((err) => console.error("welcome email failed", err));
      toast.success("Tạo tài khoản thành công");
      navigate({ to: "/" });
    } else {
      toast.success("Kiểm tra email để xác thực tài khoản");
    }
  }

  async function onGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setLoading(false);
      toast.error("Đăng ký Google thất bại", { description: String(result.error?.message ?? result.error) });
      return;
    }
    if (!result.redirected) navigate({ to: "/" });
  }

  const pwScore = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const pwLabel = ["Quá yếu", "Yếu", "Trung bình", "Khá", "Mạnh"][pwScore];

  return (
    <AuthShell
      eyebrow="Miễn phí · 60 giây"
      title={<>Tạo tài khoản <span className="italic text-gold">MarketWatch</span>.</>}
      subtitle="Mở khóa cảnh báo giá vàng, crypto, tỷ giá qua email — và bản tin sáng cá nhân hóa."
      footer={<>Đã có tài khoản?{" "}<Link to="/dang-nhap" className="font-medium text-foreground underline-offset-4 hover:underline">Đăng nhập</Link></>}
    >
      <GoogleButton onClick={onGoogle} disabled={loading} label="Đăng ký với Google" />
      <Divider />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Họ và tên</Label>
          <Input id="fullName" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@congty.vn" className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mật khẩu</Label>
          <div className="relative">
            <Input id="password" type={showPw ? "text" : "password"} autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tối thiểu 8 ký tự" className="h-11 pr-10" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground" aria-label="Hiện/ẩn mật khẩu">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <div className="pt-1.5">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < pwScore ? (pwScore >= 3 ? "bg-[var(--up)]" : pwScore === 2 ? "bg-gold" : "bg-[var(--down)]") : "bg-border"}`} />
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Độ mạnh: <span className="text-foreground">{pwLabel}</span></span>
                <span className="inline-flex items-center gap-1">
                  <Check className={`h-3 w-3 ${password.length >= 8 ? "text-[var(--up)]" : "text-muted-foreground/40"}`} /> 8+ ký tự
                </span>
              </div>
            </div>
          )}
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium tracking-wide shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--gold)_70%,transparent)] hover:opacity-95">
          {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tạo…</>) : "Tạo tài khoản miễn phí"}
        </Button>
      </form>
    </AuthShell>
  );
}