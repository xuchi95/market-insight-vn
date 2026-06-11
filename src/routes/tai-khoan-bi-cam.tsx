import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2, CheckCircle2, XCircle, Clock, Eye, EyeOff, PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo.png";

const TITLE = "Tài khoản bị tạm khoá — MarketWatch";
const DESC = "Tài khoản MarketWatch của bạn đang bị tạm khoá. Gửi đơn kháng nghị để đội ngũ xem xét.";

const STORAGE_KEY = "mw:ban-appeal-creds";

export function setPendingBanCreds(email: string, password: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password, at: Date.now() }));
  } catch {}
}

function readPendingCreds(): { email: string; password: string } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as { email?: string; password?: string; at?: number };
    if (!obj?.email || !obj?.password) return null;
    // 15 phút TTL
    if (!obj.at || Date.now() - obj.at > 15 * 60_000) return null;
    return { email: obj.email, password: obj.password };
  } catch {
    return null;
  }
}

function clearPendingCreds() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

interface Appeal {
  id: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  admin_note?: string | null;
  created_at: string;
  decided_at?: string | null;
}

export const Route = createFileRoute("/tai-khoan-bi-cam")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BannedPage,
});

function BannedPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<"loading" | "needs-creds" | "form" | "submitted" | "decided">("loading");
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // creds form (used when no sessionStorage credentials)
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [checking, setChecking] = useState(false);
  // Auto-unban detection
  const [congrats, setCongrats] = useState<null | "signing-in" | "ready" | "failed">(null);
  const [redirectIn, setRedirectIn] = useState(5);

  async function autoSignIn(c: { email: string; password: string }) {
    setCongrats("signing-in");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: c.email,
        password: c.password,
      });
      if (error) throw error;
      clearPendingCreds();
      setCongrats("ready");
    } catch (err) {
      console.error("[ban-appeal] auto sign-in failed", err);
      clearPendingCreds();
      setCongrats("failed");
    }
  }

  useEffect(() => {
    const stored = readPendingCreds();
    if (!stored) {
      setStage("needs-creds");
      return;
    }
    setCreds(stored);
    void checkStatus(stored);
  }, []);

  // While waiting for admin review, poll status every 12s so we can:
  //  - auto-sign-in + show congrats when admin approves (account unbanned)
  //  - move to "decided" when admin rejects
  useEffect(() => {
    if (stage !== "submitted" || !creds || congrats) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch("/api/public/ban-appeal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check", ...creds }),
        });
        if (cancelled) return;
        if (res.status === 409) {
          const j = await res.json().catch(() => ({}));
          if (j?.error === "not_banned") {
            void autoSignIn(creds);
            return;
          }
        }
        if (res.ok) {
          const j = await res.json();
          if (j.appeal) {
            setAppeal(j.appeal as Appeal);
            if (j.appeal.status === "approved") {
              void autoSignIn(creds);
              return;
            }
            if (j.appeal.status === "rejected") {
              setStage("decided");
              return;
            }
          }
        }
      } catch {
        /* network blip — ignore, try next tick */
      }
    };
    const id = setInterval(tick, 12_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [stage, creds, congrats]);

  // Countdown + redirect after congrats dialog appears.
  useEffect(() => {
    if (congrats !== "ready") return;
    setRedirectIn(5);
    const id = setInterval(() => {
      setRedirectIn((n) => {
        if (n <= 1) {
          clearInterval(id);
          navigate({ to: "/" });
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [congrats, navigate]);

  async function checkStatus(c: { email: string; password: string }) {
    setChecking(true);
    try {
      const res = await fetch("/api/public/ban-appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", ...c }),
      });
      const json = await res.json();
      if (res.status === 401) {
        toast.error("Email hoặc mật khẩu không đúng");
        clearPendingCreds();
        setCreds(null);
        setStage("needs-creds");
        return;
      }
      if (res.status === 409 && json.error === "not_banned") {
        toast.success("Tài khoản không còn bị khoá. Mời bạn đăng nhập lại.");
        clearPendingCreds();
        navigate({ to: "/dang-nhap" });
        return;
      }
      if (!res.ok) {
        toast.error("Không kiểm tra được trạng thái. Vui lòng thử lại.");
        setStage("needs-creds");
        return;
      }
      if (json.appeal) {
        setAppeal(json.appeal as Appeal);
        setStage(json.appeal.status === "pending" ? "submitted" : "decided");
      } else {
        setStage("form");
      }
    } catch {
      toast.error("Lỗi mạng, vui lòng thử lại.");
      setStage("needs-creds");
    } finally {
      setChecking(false);
    }
  }

  async function onCredsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!credEmail || !credPassword) return;
    const c = { email: credEmail.trim(), password: credPassword };
    setPendingBanCreds(c.email, c.password);
    setCreds(c);
    await checkStatus(c);
  }

  async function onSubmitAppeal(e: React.FormEvent) {
    e.preventDefault();
    if (!creds) return;
    const trimmed = reason.trim();
    if (trimmed.length < 20) {
      toast.error("Lý do quá ngắn — hãy mô tả ít nhất 20 ký tự để chúng tôi hiểu rõ.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/ban-appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", ...creds, reason: trimmed }),
      });
      const json = await res.json();
      if (res.status === 429) {
        toast.error("Bạn thao tác quá nhanh. Vui lòng chờ vài phút.");
        return;
      }
      if (res.status === 409 && json.error === "already_submitted") {
        toast.info("Bạn đã gửi kháng nghị trước đó.");
        if (json.appeal) {
          setAppeal(json.appeal as Appeal);
          setStage(json.appeal.status === "pending" ? "submitted" : "decided");
        }
        return;
      }
      if (!res.ok) {
        toast.error("Không gửi được kháng nghị, vui lòng thử lại sau.");
        return;
      }
      setAppeal(json.appeal as Appeal);
      setStage("submitted");
      // KHÔNG xoá creds — cần giữ để auto-login khi admin duyệt.
      toast.success("Đã gửi kháng nghị. Chúng tôi sẽ phản hồi qua email.");
    } catch {
      toast.error("Lỗi mạng, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.15] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-destructive/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[460px] w-[460px] rounded-full bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="mb-10 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />
            <span className="font-display text-xl leading-none tracking-tight">
              <span className="text-[var(--gold)]">Market</span><span className="text-foreground">Watch</span>
            </span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Về trang chủ</Link>
        </header>

        <main className="flex-1">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            <ShieldAlert className="h-3.5 w-3.5" />
            Tài khoản đang bị tạm khoá
          </div>
          <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            Tài khoản của bạn <span className="italic text-gold">đã bị tạm khoá</span>.
          </h1>
          <p className="mt-3 max-w-prose text-sm text-muted-foreground sm:text-base">
            Đội ngũ MarketWatch đã giới hạn truy cập của tài khoản này. Bạn có thể gửi đơn kháng nghị nếu cho rằng đây là sai sót — chúng tôi sẽ xem xét và phản hồi qua email.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur sm:p-8">
            {stage === "loading" && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra trạng thái…
              </div>
            )}

            {stage === "needs-creds" && (
              <form onSubmit={onCredsSubmit} className="space-y-4">
                <div>
                  <h2 className="font-display text-lg">Xác minh tài khoản</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nhập email và mật khẩu của bạn để chúng tôi xác nhận đây đúng là chủ tài khoản trước khi nhận kháng nghị.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="be-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input id="be-email" type="email" required value={credEmail} onChange={(e) => setCredEmail(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="be-pw" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mật khẩu</Label>
                  <div className="relative">
                    <Input id="be-pw" type={showPw ? "text" : "password"} required value={credPassword} onChange={(e) => setCredPassword(e.target.value)} className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={checking} className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium hover:opacity-95">
                  {checking ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang kiểm tra…</>) : "Tiếp tục"}
                </Button>
              </form>
            )}

            {stage === "form" && creds && (
              <form onSubmit={onSubmitAppeal} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-lg">Gửi đơn kháng nghị</h2>
                    <span className="text-xs text-muted-foreground">{creds.email}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Mỗi tài khoản chỉ kháng nghị được <strong>một lần duy nhất</strong>. Hãy mô tả thật rõ và đầy đủ ngữ cảnh.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reason" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Lý do kháng nghị</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={7}
                    maxLength={2000}
                    placeholder="Giải thích vì sao bạn cho rằng việc khoá là nhầm lẫn, kèm theo các tình huống cụ thể nếu có."
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Tối thiểu 20 ký tự, tối đa 2000 ký tự</span>
                    <span>{reason.length}/2000</span>
                  </div>
                </div>
                <Button type="submit" disabled={submitting || reason.trim().length < 20} className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium hover:opacity-95">
                  {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi…</>) : "Gửi kháng nghị"}
                </Button>
              </form>
            )}

            {stage === "submitted" && appeal && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold)]" />
                  <div>
                    <h2 className="font-display text-lg">Đang chờ xem xét</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Đơn kháng nghị của bạn đã được ghi nhận lúc {new Date(appeal.created_at).toLocaleString("vi-VN")}. Chúng tôi sẽ gửi kết quả về email <strong>{creds?.email}</strong> sau khi xem xét.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Nội dung đã gửi</div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{appeal.reason}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mỗi tài khoản chỉ kháng nghị được một lần — bạn không cần và không thể gửi thêm.
                </p>
              </div>
            )}

            {stage === "decided" && appeal && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  {appeal.status === "approved" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div>
                    <h2 className="font-display text-lg">
                      {appeal.status === "approved" ? "Kháng nghị được chấp nhận" : "Kháng nghị bị từ chối"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Quyết định {appeal.decided_at ? `vào ${new Date(appeal.decided_at).toLocaleString("vi-VN")}` : ""}. Chi tiết đã được gửi tới email của bạn.
                    </p>
                  </div>
                </div>
                {appeal.admin_note && (
                  <div className="rounded-lg border border-border bg-background/40 p-4">
                    <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Phản hồi từ đội ngũ</div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{appeal.admin_note}</p>
                  </div>
                )}
                {appeal.status === "approved" ? (
                  <Button asChild className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)] font-medium hover:opacity-95">
                    <Link to="/dang-nhap">Đăng nhập lại</Link>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nếu bạn cho rằng có nhầm lẫn nghiêm trọng, vui lòng liên hệ <a className="underline" href="mailto:contact@marketwatch.vn">contact@marketwatch.vn</a>.
                  </p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={!!congrats} onOpenChange={(o) => { if (!o && congrats === "ready") navigate({ to: "/" }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              {congrats === "signing-in" ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : congrats === "failed" ? (
                <XCircle className="h-7 w-7 text-destructive" />
              ) : (
                <PartyPopper className="h-7 w-7" />
              )}
            </div>
            <DialogTitle className="text-center font-display text-2xl">
              {congrats === "signing-in"
                ? "Đang đăng nhập lại…"
                : congrats === "failed"
                  ? "Tài khoản đã mở khoá"
                  : "🎉 Chúc mừng — tài khoản đã được mở lại!"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {congrats === "signing-in"
                ? "Đội ngũ MarketWatch vừa duyệt kháng nghị của bạn. Đang khôi phục phiên đăng nhập…"
                : congrats === "failed"
                  ? "Kháng nghị của bạn đã được duyệt nhưng tự động đăng nhập không thành công. Vui lòng đăng nhập lại thủ công."
                  : `Kháng nghị của bạn đã được chấp thuận. Bạn sẽ được chuyển về trang chủ sau ${redirectIn}s — chào mừng trở lại ✨`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            {congrats === "ready" && (
              <Button onClick={() => navigate({ to: "/" })} className="bg-gold-gradient text-[var(--gold-foreground)] hover:opacity-95">
                Về trang chủ ngay
              </Button>
            )}
            {congrats === "failed" && (
              <Button onClick={() => navigate({ to: "/dang-nhap" })} className="bg-gold-gradient text-[var(--gold-foreground)] hover:opacity-95">
                Đến trang đăng nhập
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}