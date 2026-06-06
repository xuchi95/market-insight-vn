import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logVerifyOtpResult } from "@/lib/auth/magic-link.functions";

const SearchSchema = z.object({
  token_hash: z.string().min(1).optional(),
  type: z.enum(["magiclink", "signup", "recovery", "invite", "email_change"]).optional(),
  next: z.string().startsWith("/").default("/"),
});

export const Route = createFileRoute("/xac-thuc-dang-nhap")({
  validateSearch: (s) => SearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Xác thực đăng nhập — MarketWatch" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { token_hash, type, next } = useSearch({ from: "/xac-thuc-dang-nhap" });
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token_hash || !type) {
        setStatus("error");
        setError("Liên kết không hợp lệ hoặc đã hết hạn.");
        logVerifyOtpResult({
          data: {
            type: type ?? "magiclink",
            status: "failed",
            error_message: "missing_token_or_type",
            has_token: Boolean(token_hash),
          },
        }).catch(() => {});
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (cancelled) return;
      if (error) {
        setStatus("error");
        setError("Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu liên kết mới.");
        logVerifyOtpResult({
          data: {
            type,
            status: "failed",
            error_message: error.message?.slice(0, 500) ?? "verify_failed",
            has_token: true,
          },
        }).catch(() => {});
        return;
      }
      setStatus("success");
      logVerifyOtpResult({
        data: { type, status: "success", has_token: true },
      }).catch(() => {});
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token_hash, type]);

  // Auto-redirect on success after a short countdown so the user sees confirmation.
  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) {
      navigate({ to: next, replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, next, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-5">
          {status === "verifying" && (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-border bg-muted/50">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-semibold text-foreground">Đang xác thực…</h1>
                <p className="text-sm text-muted-foreground">
                  Vui lòng chờ trong giây lát.
                </p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[var(--gold)]/30 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]">
                <CheckCircle2 className="h-7 w-7 text-[var(--gold)]" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-semibold text-foreground">Đăng nhập thành công</h1>
                <p className="text-sm text-muted-foreground">
                  Bạn sẽ được chuyển hướng trong {countdown} giây…
                </p>
              </div>
              <Button
                onClick={() => navigate({ to: next, replace: true })}
                className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium"
              >
                Tiếp tục ngay
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-destructive/30 bg-destructive/10">
                <XCircle className="h-7 w-7 text-destructive" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-semibold text-foreground">Không thể đăng nhập</h1>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button
                onClick={() => navigate({ to: "/dang-nhap", replace: true })}
                className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium"
              >
                Quay lại đăng nhập
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}