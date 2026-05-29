import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, Loader2, CheckCircle2, AtSign } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { requestEmailChange } from "@/lib/account.functions";
import { useQuery } from "@tanstack/react-query";
import { listEnrolledMfaMethods } from "@/lib/mfa.functions";
import { MfaStepUpForm } from "@/components/auth/MfaStepUpForm";

const TITLE = "Đổi email — MarketWatch";
const DESC = "Cập nhật địa chỉ email đăng nhập của tài khoản MarketWatch.";
const URL = "https://marketwatch.vn/cai-dat/email";

export const Route = createFileRoute("/cai-dat/email")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ChangeEmailPage,
});

function ChangeEmailPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const requestChange = useServerFn(requestEmailChange);
  const list = useServerFn(listEnrolledMfaMethods);

  const { data: mfaList } = useQuery({
    queryKey: ["mfa-enrolled-methods", user?.id],
    queryFn: () => list(),
    enabled: !!user,
  });
  const hasMfa = (mfaList?.methods?.length ?? 0) > 0;
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/dang-nhap", replace: true });
  }, [loading, user, navigate]);

  const currentEmail = user?.email ?? "";
  const isSameEmail = newEmail.trim().toLowerCase() === currentEmail.toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim());
  const canSubmit = !busy && isValidEmail && !isSameEmail && newEmail.trim().length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await requestChange({
        data: {
          newEmail: newEmail.trim(),
          stepUpToken: stepUpToken ?? undefined,
        },
      });
      setSentTo(res.sentTo ?? newEmail.trim());
      setDone(true);
      setNewEmail("");
      setStepUpToken(null);
      toast.success("Đã gửi yêu cầu đổi email", {
        description: `Vui lòng kiểm tra hộp thư ${res.sentTo ?? newEmail.trim()} và xác nhận.`,
      });
    } catch (err: any) {
      toast.error("Không gửi được yêu cầu", { description: err?.message });
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
          <span className="text-foreground">Đổi email</span>
        </nav>

        <header className="mb-8">
          <h1 className="font-display text-3xl tracking-tight">Đổi email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cập nhật địa chỉ email đăng nhập. Bạn sẽ nhận được thư xác nhận tại địa chỉ mới.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6">
          {done ? (
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-[color-mix(in_oklab,var(--up)_30%,transparent)] bg-[color-mix(in_oklab,var(--up)_10%,transparent)] text-[var(--up)]">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="font-medium">Yêu cầu đã được gửi</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Email xác nhận đã gửi tới <span className="font-medium text-foreground/80">{sentTo}</span>. Vui lòng mở hộp thư và nhấn liên kết xác nhận để hoàn tất đổi email.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => { setDone(false); setSentTo(""); }}>Đổi tiếp</Button>
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
                  Tài khoản đang bật bảo mật 2 lớp. Hãy xác minh trước khi đổi email.
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
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Email hiện tại
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="text"
                    value={currentEmail}
                    disabled
                    className="h-11 pr-10"
                    readOnly
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-muted-foreground">
                    <AtSign className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="new-email" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Email mới
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    autoComplete="email"
                    className="h-11 pr-10"
                    placeholder="example@domain.com"
                    aria-invalid={newEmail.length > 0 && (!isValidEmail || isSameEmail) ? true : undefined}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </span>
                </div>
                {newEmail.length > 0 && isSameEmail && (
                  <p className="mt-1 text-xs text-rose-500">Email mới trùng với email hiện tại.</p>
                )}
                {newEmail.length > 0 && !isValidEmail && !isSameEmail && (
                  <p className="mt-1 text-xs text-rose-500">Email không hợp lệ.</p>
                )}
              </div>

              <ul className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <li>• Sau khi gửi, hãy kiểm tra hộp thư và nhấn liên kết xác nhận.</li>
                <li>• Email xác nhận có thể nằm trong mục Thư rác / Spam.</li>
                <li>• Nếu không xác nhận, email hiện tại vẫn được giữ nguyên.</li>
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
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Gửi yêu cầu đổi email
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
