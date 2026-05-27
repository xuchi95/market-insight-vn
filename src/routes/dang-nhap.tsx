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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error("Đăng nhập không thành công", { description: error.message });
      return;
    }
    toast.success("Đăng nhập thành công");
    navigate({ to: "/" });
  }

  async function onGoogle() {
    setLoading(true);
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-md">
          <h1 className="text-3xl font-bold mb-2">Đăng nhập</h1>
          <p className="text-muted-foreground mb-6">Truy cập tài khoản MarketWatch để quản lý cảnh báo giá qua email.</p>

          <Button type="button" variant="outline" className="w-full mb-4" onClick={onGoogle} disabled={loading}>
            Tiếp tục với Google
          </Button>
          <div className="flex items-center gap-3 my-4 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> hoặc <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Đang xử lý…" : "Đăng nhập"}</Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6">
            Chưa có tài khoản? <Link to="/dang-ky" className="text-foreground font-medium underline">Đăng ký</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}