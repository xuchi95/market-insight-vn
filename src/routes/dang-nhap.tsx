import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AuthShell, GoogleButton, Divider } from "@/components/site/AuthShell";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { listEnrolledMfaMethods } from "@/lib/mfa.functions";
import { clearMfaVerified } from "@/routes/xac-thuc-2fa";

const TITLE = "Đăng nhập — MarketWatch";
const DESC = "Đăng nhập MarketWatch để đặt cảnh báo giá và nhận email khi vàng, crypto chạm ngưỡng.";
const URL = "https://marketwatch.vn/dang-nhap";

export const Route = createFileRoute("/dang-nhap")({
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
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [magicSent, setMagicSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      toast.error("Đăng nhập không thành công", { description: error.message });
      return;
    }
    clearMfaVerified();
    try {
      const s = await listEnrolledMfaMethods();
      setLoading(false);
      if (s.methods && s.methods.length > 0) {
        navigate({ to: "/xac-thuc-2fa", replace: true });
        return;
      }
    } catch {
      setLoading(false);
    }
    toast.success("Đăng nhập thành công");
    navigate({ to: "/" });
  }

  async function onGoogle() {
    setLoading(true);
    clearMfaVerified();
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setLoading(false);
      toast.error("Đăng nhập Google thất bại", { description: String(result.error?.message ?? result.error) });
      return;
    }
    if (!result.redirected) {
      navigate({ to: "/" });
    }
  }

  async function onMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const target = email.trim();
    if (!target) {
      toast.error("Vui lòng nhập email");
      return;
    }
    setLoading(true);
    clearMfaVerified();
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        shouldCreateUser: false,
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Không gửi được magic link", { description: error.message });
      return;
    }
    setMagicSent(true);
    toast.success("Đã gửi magic link", { description: `Kiểm tra hộp thư ${target} và bấm vào liên kết để đăng nhập.` });
  }

  return (
    <AuthShell
      eyebrow="Tài khoản MarketWatch"
      title={<>Chào mừng <span className="italic text-gold">trở lại</span>.</>}
      subtitle="Đăng nhập để tiếp tục theo dõi cảnh báo giá và bản tin cá nhân hóa của bạn."
      footer={<>Chưa có tài khoản?{" "}<Link to="/dang-ky" className="font-medium text-foreground underline-offset-4 hover:underline">Tạo tài khoản miễn phí</Link></>}
    >
      <GoogleButton onClick={onGoogle} disabled={loading} loading={loading} label="Tiếp tục với Google" />
      <Divider />
      {mode === "password" ? (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@congty.vn" className="h-11" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mật khẩu</Label>
            <Link to="/quen-mat-khau" className="text-xs text-muted-foreground hover:text-gold">Quên mật khẩu?</Link>
          </div>
          <div className="relative">
            <Input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 pr-10" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground" aria-label="Hiện/ẩn mật khẩu">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium tracking-wide shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--gold)_70%,transparent)] hover:opacity-95">
          {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xử lý…</>) : "Đăng nhập"}
        </Button>
        <button type="button" onClick={() => { setMode("magic"); setMagicSent(false); }} className="block w-full text-center text-xs text-muted-foreground hover:text-gold">
          Đăng nhập bằng magic link qua email
        </button>
      </form>
      ) : (
      <form onSubmit={onMagicLink} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="magic-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
          <Input id="magic-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@congty.vn" className="h-11" />
          <p className="text-xs text-muted-foreground">Chúng tôi sẽ gửi một liên kết đăng nhập đến email của bạn. Bấm vào liên kết để đăng nhập — không cần mật khẩu.</p>
        </div>
        <Button type="submit" disabled={loading || magicSent} className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium tracking-wide shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--gold)_70%,transparent)] hover:opacity-95">
          {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi…</>) : magicSent ? "Đã gửi — kiểm tra email" : "Gửi magic link"}
        </Button>
        {magicSent && (
          <p className="text-center text-xs text-muted-foreground">Không thấy email? Kiểm tra thư mục Spam hoặc thử lại sau ít phút.</p>
        )}
        <button type="button" onClick={() => { setMode("password"); setMagicSent(false); }} className="block w-full text-center text-xs text-muted-foreground hover:text-gold">
          Quay lại đăng nhập bằng mật khẩu
        </button>
      </form>
      )}
    </AuthShell>
  );
}