import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/site/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { verifyMfaChallenge, getMfaStatus } from "@/lib/mfa.functions";

const MFA_SESSION_KEY = "mw_mfa_ok";

export function markMfaVerified() {
  try { sessionStorage.setItem(MFA_SESSION_KEY, "1"); } catch { /* noop */ }
}
export function isMfaVerified() {
  try { return sessionStorage.getItem(MFA_SESSION_KEY) === "1"; } catch { return false; }
}
export function clearMfaVerified() {
  try { sessionStorage.removeItem(MFA_SESSION_KEY); } catch { /* noop */ }
}

const TITLE = "Xác minh 2 lớp — MarketWatch";

export const Route = createFileRoute("/xac-thuc-2fa")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Mfa2FAPage,
});

function Mfa2FAPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const verify = useServerFn(verifyMfaChallenge);
  const status = useServerFn(getMfaStatus);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/dang-nhap", replace: true });
      return;
    }
    // If user has no MFA, skip the page entirely.
    status().then((s) => {
      if (!s.enrolled) {
        markMfaVerified();
        navigate({ to: "/", replace: true });
      }
    }).catch(() => {});
  }, [loading, user, navigate, status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await verify({ data: { code: code.trim() } });
      markMfaVerified();
      toast.success("Đã xác minh");
      navigate({ to: "/", replace: true });
    } catch (e: any) {
      toast.error("Không xác minh được", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    clearMfaVerified();
    await signOut();
    navigate({ to: "/dang-nhap", replace: true });
  }

  return (
    <AuthShell
      eyebrow="Xác minh 2 lớp"
      title={<>Nhập mã từ <span className="italic text-gold">ứng dụng xác thực</span></>}
      subtitle="Mở Google Authenticator / Authy / 1Password và nhập mã 6 chữ số. Hoặc dùng mã dự phòng dạng abcde-fghij."
      footer={<button onClick={onCancel} className="hover:text-foreground">Đăng xuất và quay lại đăng nhập</button>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="otp" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mã xác minh</Label>
          <Input
            id="otp"
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, 20))}
            placeholder="123456"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            className="h-12 text-center font-mono text-xl tracking-[0.4em]"
          />
        </div>
        <Button type="submit" disabled={busy || code.trim().length < 6} className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium">
          {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xác minh…</>) : (<><ShieldCheck className="mr-2 h-4 w-4" />Xác minh</>)}
        </Button>
      </form>
    </AuthShell>
  );
}

// Suppress unused-import warning when file is tree-shaken
void supabase;