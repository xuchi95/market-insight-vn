import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/site/AuthShell";
import { Eye, EyeOff, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

const TITLE = "Đặt lại mật khẩu — MarketWatch";
const DESC = "Tạo mật khẩu mới cho tài khoản MarketWatch của bạn.";
const PAGE_URL = "https://marketwatch.vn/dat-lai-mat-khau";

export const Route = createFileRoute("/dat-lai-mat-khau")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: PAGE_URL },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

type Status = "checking" | "ready" | "invalid";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verify recovery session. Supabase delivers the user here in one of two ways:
  // 1. Implicit hash: #access_token=...&type=recovery — the client SDK parses it
  //    automatically and fires a PASSWORD_RECOVERY event.
  // 2. PKCE code: ?code=... — we must exchange it for a session manually.
  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    (async () => {
      const u = new URL(window.location.href);
      const code = u.searchParams.get("code");
      const errorDesc = u.searchParams.get("error_description") ?? u.hash.match(/error_description=([^&]+)/)?.[1];

      if (errorDesc) {
        if (!cancelled) setStatus("invalid");
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) { setStatus("invalid"); return; }
        // Clean ?code from URL so refresh doesn't try to re-exchange.
        u.searchParams.delete("code");
        window.history.replaceState({}, "", u.pathname + (u.search ? `?${u.searchParams}` : ""));
        setStatus("ready");
        return;
      }

      // Hash flow — give SDK a moment to parse, then re-check.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) setStatus("ready");
      else {
        // Wait briefly for PASSWORD_RECOVERY event; if it never fires, mark invalid.
        setTimeout(async () => {
          if (cancelled) return;
          const { data: again } = await supabase.auth.getSession();
          setStatus(again.session ? "ready" : "invalid");
        }, 1200);
      }
    })();

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }
    if (password !== confirm) {
      toast.error("Mật khẩu nhập lại không khớp");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Không đổi được mật khẩu", { description: error.message });
      return;
    }
    toast.success("Đổi mật khẩu thành công", { description: "Bạn đã được đăng nhập lại." });
    navigate({ to: "/" });
  }

  return (
    <AuthShell
      eyebrow="Bảo mật tài khoản"
      title={<>Đặt lại <span className="italic text-gold">mật khẩu</span>.</>}
      subtitle="Chọn mật khẩu mới mạnh — ít nhất 8 ký tự, kết hợp chữ và số."
      footer={<>Cần liên kết mới?{" "}<Link to="/quen-mat-khau" className="font-medium text-foreground underline-offset-4 hover:underline">Gửi lại email</Link></>}
    >
      {status === "checking" && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang xác minh liên kết…
        </div>
      )}

      {status === "invalid" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-medium">Liên kết không hợp lệ hoặc đã hết hạn</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Liên kết đặt lại mật khẩu chỉ dùng được một lần và có hiệu lực trong 60 phút. Hãy yêu cầu một liên kết mới.
            </p>
          </div>
          <Button asChild className="h-10 w-full bg-gold-gradient text-[var(--gold-foreground)]">
            <Link to="/quen-mat-khau">Gửi liên kết mới</Link>
          </Button>
        </div>
      )}

      {status === "ready" && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-2 rounded-md border border-gold/25 bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            Đã xác minh — bạn có thể đặt mật khẩu mới ngay bây giờ.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nhập lại mật khẩu</Label>
            <Input
              id="confirm"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium tracking-wide shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--gold)_70%,transparent)] hover:opacity-95"
          >
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu…</>) : "Đổi mật khẩu"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}