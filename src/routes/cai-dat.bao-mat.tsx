import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, ShieldOff, Loader2, Copy, KeyRound, Smartphone } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  getMfaStatus,
  startMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
} from "@/lib/mfa.functions";

const TITLE = "Bảo mật 2 lớp — MarketWatch";
const DESC = "Bật xác thực 2 lớp TOTP bằng Google Authenticator, Authy hoặc 1Password để bảo vệ tài khoản MarketWatch của bạn.";
const URL = "https://marketwatch.vn/cai-dat/bao-mat";

export const Route = createFileRoute("/cai-dat/bao-mat")({
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
  component: SecuritySettingsPage,
});

function SecuritySettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const status = useServerFn(getMfaStatus);
  const startEnroll = useServerFn(startMfaEnrollment);
  const confirmEnroll = useServerFn(confirmMfaEnrollment);
  const disable = useServerFn(disableMfa);

  const { data: mfa, isLoading } = useQuery({
    queryKey: ["mfa-status", user?.id],
    queryFn: () => status(),
    enabled: !!user,
  });

  const [enrolling, setEnrolling] = useState(false);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/dang-nhap", replace: true });
  }, [authLoading, user, navigate]);

  async function onStartEnroll() {
    setBusy(true);
    try {
      const res = await startEnroll();
      setOtpauthUri(res.otpauthUri);
      setSecret(res.secret);
      setEnrolling(true);
    } catch (e: any) {
      toast.error("Không bắt đầu được", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    setBusy(true);
    try {
      const res = await confirmEnroll({ data: { code: code.trim() } });
      setBackupCodes(res.backupCodes);
      setEnrolling(false);
      setOtpauthUri(null);
      setSecret(null);
      setCode("");
      qc.invalidateQueries({ queryKey: ["mfa-status"] });
      toast.success("Đã bật 2FA", { description: "Hãy lưu mã dự phòng ở nơi an toàn." });
    } catch (e: any) {
      toast.error("Xác minh thất bại", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setBusy(true);
    try {
      await disable({ data: { code: disableCode.trim() } });
      setDisableCode("");
      qc.invalidateQueries({ queryKey: ["mfa-status"] });
      toast.success("Đã tắt 2FA");
    } catch (e: any) {
      toast.error("Không tắt được", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  function copyText(t: string) {
    navigator.clipboard.writeText(t).then(
      () => toast.success("Đã sao chép"),
      () => toast.error("Không sao chép được"),
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">Bảo mật 2 lớp</span>
        </nav>

        <header className="mb-8">
          <h1 className="font-display text-3xl tracking-tight">Bảo mật 2 lớp (2FA)</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Khi bật, mỗi lần đăng nhập bạn sẽ cần nhập thêm mã 6 chữ số từ ứng dụng xác thực (Google Authenticator, Authy, 1Password, …).
          </p>
        </header>

        {(authLoading || isLoading) ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : backupCodes ? (
          <BackupCodesPanel codes={backupCodes} onDone={() => setBackupCodes(null)} />
        ) : mfa?.enrolled ? (
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-[color-mix(in_oklab,var(--up)_30%,transparent)] bg-[color-mix(in_oklab,var(--up)_10%,transparent)] text-[var(--up)]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="font-medium">2FA đang bật</div>
                <div className="text-xs text-muted-foreground">
                  Đã bật từ {mfa.enrolledAt ? new Date(mfa.enrolledAt).toLocaleString("vi-VN") : "—"}
                </div>
              </div>
            </div>

            <div className="my-6 h-px bg-border" />

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tắt 2FA</Label>
              <p className="text-xs text-muted-foreground">
                Nhập mã 6 chữ số từ ứng dụng xác thực (hoặc mã dự phòng dạng <code>abcde-fghij</code>) để xác nhận.
              </p>
              <div className="flex gap-2">
                <Input
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="123 456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="h-10 font-mono"
                />
                <Button onClick={onDisable} disabled={busy || disableCode.length < 6} variant="destructive">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                  <span className="ml-2">Tắt 2FA</span>
                </Button>
              </div>
            </div>
          </section>
        ) : !enrolling ? (
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
                <ShieldOff className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="font-medium">2FA chưa bật</div>
                <div className="text-xs text-muted-foreground">Tài khoản đang chỉ dùng mật khẩu.</div>
              </div>
            </div>

            <ul className="my-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <li className="rounded-lg border border-border p-3">
                <Smartphone className="mb-2 h-4 w-4 text-gold" />
                Quét mã QR bằng ứng dụng xác thực.
              </li>
              <li className="rounded-lg border border-border p-3">
                <KeyRound className="mb-2 h-4 w-4 text-gold" />
                Nhập mã 6 chữ số để xác minh.
              </li>
              <li className="rounded-lg border border-border p-3">
                <ShieldCheck className="mb-2 h-4 w-4 text-gold" />
                Lưu mã dự phòng để dùng khi mất điện thoại.
              </li>
            </ul>

            <Button onClick={onStartEnroll} disabled={busy} className="bg-gold-gradient text-[var(--gold-foreground)]">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Bật 2FA ngay
            </Button>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">Bước 1 · Quét mã QR</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mở Google Authenticator / Authy / 1Password → thêm tài khoản mới → quét mã dưới đây.
            </p>

            <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
              <div className="rounded-xl border border-border bg-white p-4">
                {otpauthUri ? (
                  <QRCodeSVG value={otpauthUri} size={180} level="M" />
                ) : null}
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Không quét được? Nhập tay khoá bí mật
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs">
                      {secret ?? "—"}
                    </code>
                    {secret && (
                      <Button variant="outline" size="sm" onClick={() => copyText(secret)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="otp" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Bước 2 · Mã 6 chữ số
                  </Label>
                  <Input
                    id="otp"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="mt-1 h-11 text-center font-mono text-lg tracking-[0.4em]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={onConfirm} disabled={busy || code.length !== 6} className="bg-gold-gradient text-[var(--gold-foreground)]">
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Xác minh & bật
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setEnrolling(false); setOtpauthUri(null); setSecret(null); setCode(""); }}
                    disabled={busy}
                  >
                    Huỷ
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function BackupCodesPanel({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  function downloadTxt() {
    const blob = new Blob(
      [`MarketWatch — Mã dự phòng 2FA\nLưu file này ở nơi an toàn.\nMỗi mã chỉ dùng được 1 lần.\n\n${codes.join("\n")}\n`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marketwatch-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-gold/30 bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] p-6">
      <h2 className="font-display text-xl">Lưu 8 mã dự phòng</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Mỗi mã chỉ dùng được 1 lần khi bạn không có điện thoại. Lưu ngay — chúng sẽ không hiện lại.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
        {codes.map((c) => (
          <div key={c} className="rounded-md border border-border bg-card px-3 py-2 text-center tracking-wider">
            {c}
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <Button onClick={downloadTxt} variant="outline">Tải về .txt</Button>
        <Button onClick={() => { navigator.clipboard.writeText(codes.join("\n")); }} variant="outline">Sao chép</Button>
        <Button onClick={onDone} className="bg-gold-gradient text-[var(--gold-foreground)]">Tôi đã lưu, đóng</Button>
      </div>
    </section>
  );
}