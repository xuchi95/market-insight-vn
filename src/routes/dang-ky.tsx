import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { sendWelcomeEmail } from "@/lib/email/welcome.functions";

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-md">
          <h1 className="text-3xl font-bold mb-2">Tạo tài khoản</h1>
          <p className="text-muted-foreground mb-6">Miễn phí. Cần thiết để đặt cảnh báo giá qua email.</p>

          <Button type="button" variant="outline" className="w-full mb-4" onClick={onGoogle} disabled={loading}>
            Tiếp tục với Google
          </Button>
          <div className="flex items-center gap-3 my-4 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> hoặc <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fullName">Họ tên</Label>
              <Input id="fullName" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground">Tối thiểu 8 ký tự.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Đang tạo…" : "Tạo tài khoản"}</Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6">
            Đã có tài khoản? <Link to="/dang-nhap" className="text-foreground font-medium underline">Đăng nhập</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}