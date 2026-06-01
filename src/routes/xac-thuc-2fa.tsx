import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { signalAuthWelcome } from "@/components/site/AuthWelcomeBanner";
import { Loader2, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/site/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listEnrolledMfaMethods } from "@/lib/mfa.functions";
import { MfaStepUpForm } from "@/components/auth/MfaStepUpForm";
import { trustDevice } from "@/lib/mfa-trust";

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
  const [remember, setRemember] = useState(true);
  const rememberRef = useRef(remember);
  useEffect(() => { rememberRef.current = remember; }, [remember]);

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
        <div className="space-y-4">
          <MfaStepUpForm
            username={user?.email ?? undefined}
            submitLabel="Xác minh"
            onVerified={() => {
              markMfaVerified();
              if (rememberRef.current && user?.id) {
                trustDevice(user.id, 30);
              }
              signalAuthWelcome({ kind: "verified", email: user?.email ?? undefined });
              navigate({ to: "/", replace: true });
            }}
          />
          <TrustDeviceToggle checked={remember} onChange={setRemember} />
        </div>
      )}
    </AuthShell>
  );
}

function TrustDeviceToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
        checked
          ? "border-[color-mix(in_oklab,var(--gold)_45%,transparent)] bg-[color-mix(in_oklab,var(--gold)_6%,transparent)]"
          : "border-border bg-muted/20 hover:border-[color-mix(in_oklab,var(--gold)_30%,transparent)]"
      }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all ${
          checked
            ? "border-[var(--gold)] bg-gold-gradient shadow-[0_0_0_3px_color-mix(in_oklab,var(--gold)_15%,transparent)]"
            : "border-border bg-background"
        }`}
      >
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 text-[var(--gold-foreground)] transition-opacity ${checked ? "opacity-100" : "opacity-0"}`}
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.5 6.5l2.5 2.5L9.5 3.5"
          />
        </svg>
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-gold" />
          Tin tưởng thiết bị này trong 30 ngày
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
          Lần đăng nhập sau trên trình duyệt này sẽ không cần nhập mã xác minh.
          Chỉ bật trên thiết bị cá nhân của bạn.
        </span>
      </span>
    </label>
  );
}

// Suppress unused-import warning when file is tree-shaken
void supabase;