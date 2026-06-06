import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token_hash || !type) {
        setError("Liên kết không hợp lệ hoặc đã hết hạn.");
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (cancelled) return;
      if (error) {
        setError("Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu liên kết mới.");
        return;
      }
      navigate({ to: next, replace: true });
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token_hash, type, next, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Không thể đăng nhập</h1>
            <p className="text-muted-foreground">{error}</p>
            <a
              href="/dang-nhap"
              className="inline-block mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground"
            >
              Quay lại đăng nhập
            </a>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Đang xác thực...</h1>
            <p className="text-muted-foreground">Vui lòng chờ trong giây lát.</p>
          </>
        )}
      </div>
    </div>
  );
}