import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/site/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listEnrolledMfaMethods } from "@/lib/mfa.functions";
import { MfaStepUpForm } from "@/components/auth/MfaStepUpForm";

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
  const list = useServerFn(listEnrolledMfaMethods);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/dang-nhap", replace: true });
      return;
    }
    // If user has no enrolled method, skip the page entirely.
    list().then((d) => {
      if (!d.methods || d.methods.length === 0) {
        markMfaVerified();
        navigate({ to: "/", replace: true });
      }
    }).catch(() => {}).finally(() => setChecking(false));
  }, [loading, user, navigate, list]);

  async function onCancel() {
    clearMfaVerified();
    await signOut();
    navigate({ to: "/dang-nhap", replace: true });
  }

  return (
    <AuthShell
      eyebrow="Xác minh 2 lớp"
      title={<>Xác minh để <span className="italic text-gold">tiếp tục</span></>}
      subtitle="Chọn 1 phương thức bạn đã bật để hoàn tất đăng nhập."
      footer={<button onClick={onCancel} className="hover:text-foreground">Đăng xuất và quay lại đăng nhập</button>}
    >
      {checking ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      ) : (
        <MfaStepUpForm
          username={user?.email ?? undefined}
          submitLabel="Xác minh"
          onVerified={() => {
            markMfaVerified();
            toast.success("Đã xác minh");
            navigate({ to: "/", replace: true });
          }}
        />
      )}
    </AuthShell>
  );
}

// Suppress unused-import warning when file is tree-shaken
void supabase;