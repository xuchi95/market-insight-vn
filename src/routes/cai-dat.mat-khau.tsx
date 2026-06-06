import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { changePassword } from "@/lib/account.functions";
import { useQuery } from "@tanstack/react-query";
import { listEnrolledMfaMethods } from "@/lib/mfa.functions";
import { MfaStepUpForm } from "@/components/auth/MfaStepUpForm";

const TITLE = "Đổi mật khẩu — MarketWatch";
const DESC = "Cập nhật mật khẩu đăng nhập của tài khoản MarketWatch.";
const URL = "https://marketwatch.vn/cai-dat/mat-khau";

export const Route = createFileRoute("/cai-dat/mat-khau")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ChangePasswordPage,
});

function strengthOf(pw: string): { score: number; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const label = ["Rất yếu", "Yếu", "Trung bình", "Khá", "Mạnh", "Rất mạnh"][Math.min(s, 5)];
  return { score: Math.min(s, 5), label };
}

function ChangePasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const change = useServerFn(changePassword);
  const list = useServerFn(listEnrolledMfaMethods);

  const { data: mfaList } = useQuery({
    queryKey: ["mfa-enrolled-methods", user?.id],
    queryFn: () => list(),
    enabled: !!user,
  });
  const hasMfa = (mfaList?.methods?.length ?? 0) > 0;
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/dang-nhap", replace: true });
  }, [loading, user, navigate]);

  const strength = strengthOf(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit =
    !busy &&
    current.length > 0 &&
    next.length >= 8 &&
    next === confirm &&
    next !== current;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      await change({
        data: {
          currentPassword: current,
          newPassword: next,
          stepUpToken: stepUpToken ?? undefined,
        },
      });
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setStepUpToken(null);
      toast.success("Đã đổi mật khẩu", {
        description: "Lần đăng nhập tới hãy dùng mật khẩu mới.",
      });
    } catch (err: any) {
      toast.error("Không đổi được mật khẩu", { description: err?.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-10">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <span className="mx-2 opacity-50">/</span>
          <Link to="/cai-dat" className="hover:text-foreground">Cài đặt</Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">Đổi mật khẩu</span>
        </nav>

        <header className="mb-8">
          <h1 className="font-display text-3xl tracking-tight">Đổi mật khẩu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vì lý do bảo mật, bạn cần nhập đúng mật khẩu hiện tại trước khi đặt mật khẩu mới.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6">
          {done ? (
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-[color-mix(in_oklab,var(--up)_30%,transparent)] bg-[color-mix(in_oklab,var(--up)_10%,transparent)] text-[var(--up)]">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="font-medium">Mật khẩu đã được cập nhật</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Lần đăng nhập tới trên các thiết bị khác hãy dùng mật khẩu mới.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => setDone(false)}>Đổi tiếp</Button>
                  <Button asChild className="bg-gold-gradient text-[var(--gold-foreground)]">
                    <Link to="/cai-dat">Về Cài đặt</Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : hasMfa && !stepUpToken ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium">Xác minh 2 lớp</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tài khoản đang bật bảo mật 2 lớp. Hãy xác minh trước khi đổi mật khẩu.
                </p>
              </div>
              <MfaStepUpForm
                username={user?.email ?? undefined}
                submitLabel="Xác minh để tiếp tục"
                onVerified={(token) => setStepUpToken(token)}
              />
            </div>
          ) : (
            <form className="space-y-5" onSubmit={onSubmit} autoComplete="off">
              <div>
                <Label htmlFor="current" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Mật khẩu hiện tại
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="current"
                    type={showCurrent ? "text" : "password"}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    autoComplete="current-password"
                    className="h-11 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="next" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Mật khẩu mới
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="next"
                    type={showNext ? "text" : "password"}
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    autoComplete="new-password"
                    className="h-11 pr-10"
                    placeholder="Tối thiểu 8 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNext((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-muted-foreground hover:text-foreground"
                  >
                    {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {next.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex h-1.5 flex-1 gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-colors ${
                            i < strength.score
                              ? strength.score <= 2
                                ? "bg-rose-500/80"
                                : strength.score === 3
                                  ? "bg-amber-500/80"
                                  : "bg-emerald-500/80"
                              : "bg-border"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right">{strength.label}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirm" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Xác nhận mật khẩu mới
                </Label>
                <Input
                  id="confirm"
                  type={showNext ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1 h-11"
                  placeholder="Nhập lại mật khẩu mới"
                  aria-invalid={mismatch || undefined}
                />
                {mismatch && (
                  <p className="mt-1 text-xs text-rose-500">Mật khẩu xác nhận không khớp.</p>
                )}
              </div>

              <ul className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <li>• Tối thiểu 8 ký tự (khuyến nghị ≥ 12).</li>
                <li>• Trộn chữ HOA/thường, số và ký tự đặc biệt để mạnh hơn.</li>
                <li>• Không dùng lại mật khẩu cũ hoặc mật khẩu từng dùng ở dịch vụ khác.</li>
              </ul>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="bg-gold-gradient text-[var(--gold-foreground)]"
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Cập nhật mật khẩu
                </Button>
                <Button type="button" variant="ghost" asChild>
                  <Link to="/cai-dat">Huỷ</Link>
                </Button>
              </div>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}