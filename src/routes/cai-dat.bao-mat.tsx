import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck, ShieldOff, Loader2, Copy, KeyRound, Smartphone,
  Mail, Link2, Fingerprint, Check, Star, Trash2, Plus, Send,
  KeyRound as KeyRoundIcon, ScanLine, Bell, MonitorSmartphone, RefreshCw,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  getMfaStatus,
  startMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
  listMfaMethods,
  setDefaultMfaMethod,
  startEmailOtpEnrollment,
  confirmEmailOtpEnrollment,
  removeMfaMethod,
  startMagicLinkEnrollment,
  checkMagicLinkEnrollment,
  startPasskeyEnrollment,
  confirmPasskeyEnrollment,
  getRecoveryCodesStatus,
  regenerateBackupCodes,
  type MfaMethodType,
  type MfaMethodSummary,
} from "@/lib/mfa.functions";
import { MfaStepUpForm } from "@/components/auth/MfaStepUpForm";

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
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { property: "og:url", content: URL },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SecuritySettingsPage,
});

function SecuritySettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listMethods = useServerFn(listMfaMethods);
  const setDefault = useServerFn(setDefaultMfaMethod);

  const { data: mfaData, isLoading } = useQuery({
    queryKey: ["mfa-methods", user?.id],
    queryFn: () => listMethods(),
    enabled: !!user,
  });

  type CatalogType = MfaMethodType | "recovery_codes" | "push" | "in_app" | "qr_code";
  const [activePanel, setActivePanel] = useState<CatalogType | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/dang-nhap", replace: true });
  }, [authLoading, user, navigate]);

  async function onSetDefault(methodId: string) {
    try {
      await setDefault({ data: { methodId } });
      qc.invalidateQueries({ queryKey: ["mfa-methods"] });
      toast.success("Đã đặt làm phương thức mặc định");
    } catch (e: any) {
      toast.error("Không cập nhật được", { description: e?.message });
    }
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["mfa-methods"] });
  }

  const methods = mfaData?.methods ?? [];
  const enrolledMethods = methods.filter((m) => m.enrolled);
  const hasAny = enrolledMethods.length > 0;

  const methodCatalog: Array<{
    type: MfaMethodType | "recovery_codes" | "push" | "in_app" | "qr_code";
    title: string;
    desc: string;
    a11yDesc: string;
    icon: any;
    available: boolean;
    soon?: string;
  }> = [
    { type: "totp", title: "Authenticator app", desc: "", a11yDesc: "Xác minh bằng mã 6 chữ số từ ứng dụng như Google Authenticator, Authy hoặc 1Password.", icon: Smartphone, available: true },
    { type: "email_otp", title: "Email OTP", desc: "", a11yDesc: "Nhận mã 6 chữ số gửi qua email mỗi lần xác minh.", icon: Mail, available: true },
    { type: "magic_link", title: "Magic Link", desc: "", a11yDesc: "Bấm link xác minh gửi tới email để hoàn tất đăng nhập.", icon: Link2, available: true },
    { type: "passkey", title: "Passkey", desc: "", a11yDesc: "Xác minh bằng Face ID, Touch ID hoặc Windows Hello trên thiết bị.", icon: Fingerprint, available: true },
    { type: "recovery_codes", title: "Mã dự phòng", desc: "", a11yDesc: "Tạo bộ mã sử dụng một lần để đăng nhập khi mất thiết bị xác minh.", icon: KeyRoundIcon, available: true },
    { type: "push", title: "Push notification", desc: "", a11yDesc: "Xác nhận bằng thông báo đẩy trên app Authsignal. Tính năng sắp ra mắt.", icon: Bell, available: false, soon: "Cần app Authsignal" },
    { type: "in_app", title: "In-app verification", desc: "", a11yDesc: "Xác nhận trong app Authsignal đã đăng nhập. Tính năng sắp ra mắt.", icon: MonitorSmartphone, available: false, soon: "Cần app Authsignal" },
    { type: "qr_code", title: "QR code verification", desc: "", a11yDesc: "Quét QR bằng app Authsignal để xác nhận. Tính năng sắp ra mắt.", icon: ScanLine, available: false, soon: "Cần app Authsignal" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">Bảo mật tài khoản</span>
        </nav>

        <header className="mb-8">
          <h1 className="font-display text-3xl tracking-tight">Bảo mật tài khoản</h1>
        </header>

        {(authLoading || isLoading) ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : backupCodes ? (
          <BackupCodesPanel codes={backupCodes} onDone={() => setBackupCodes(null)} />
        ) : (
          <>
            {/* Overall status banner */}
            <section
              className={`mb-6 rounded-2xl border p-5 ${
                hasAny
                  ? "border-[color-mix(in_oklab,var(--up)_30%,transparent)] bg-[color-mix(in_oklab,var(--up)_8%,transparent)]"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-lg ${
                    hasAny
                      ? "border border-[color-mix(in_oklab,var(--up)_30%,transparent)] bg-[color-mix(in_oklab,var(--up)_15%,transparent)] text-[var(--up)]"
                      : "border border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {hasAny ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
                </span>
                <div className="flex-1">
                  <div className="font-medium">
                    {hasAny
                      ? `Đã bật ${enrolledMethods.length} phương thức xác thực`
                      : "Chưa có phương thức xác thực nào"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {hasAny
                      ? `Còn ${mfaData?.backupCodesRemaining ?? 0} mã dự phòng. Khuyên dùng ít nhất 2 phương thức để tránh bị khoá tài khoản nếu mất thiết bị.`
                      : "Tài khoản đang chỉ dùng mật khẩu. Thêm 1 phương thức bên dưới để bảo vệ tốt hơn."}
                  </div>
                </div>
              </div>
            </section>

            {/* Method cards */}
            <div className="space-y-3" role="list">
              {methodCatalog.map((m) => {
                const enrolled = enrolledMethods.find((x) => x.type === m.type);
                return (
                  <MethodCard
                    key={m.type}
                    catalog={m}
                    enrolled={enrolled}
                    isExpanded={activePanel === m.type}
                    onToggle={() => setActivePanel(activePanel === m.type ? null : m.type)}
                    onSetDefault={onSetDefault}
                    onChange={refresh}
                    onBackupCodes={(codes) => setBackupCodes(codes)}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

/* -------------------- Method card -------------------- */

function MethodCard({
  catalog,
  enrolled,
  isExpanded,
  onToggle,
  onSetDefault,
  onChange,
  onBackupCodes,
}: {
  catalog: {
    type: MfaMethodType | "recovery_codes" | "push" | "in_app" | "qr_code";
    title: string;
    desc: string;
    a11yDesc: string;
    icon: any;
    available: boolean;
    soon?: string;
  };
  enrolled: MfaMethodSummary | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  onSetDefault: (id: string) => void;
  onChange: () => void;
  onBackupCodes: (codes: string[]) => void;
}) {
  const Icon = catalog.icon;
  const reactId = useId();
  const titleId = `mfa-card-${reactId}-title`;
  const descId = `mfa-card-${reactId}-desc`;
  const panelId = `mfa-card-${reactId}-panel`;
  const statusBits = [
    enrolled ? "đã bật" : "chưa bật",
    enrolled?.isDefault ? "phương thức mặc định" : null,
    !catalog.available ? "sắp ra mắt" : null,
  ].filter(Boolean).join(", ");
  return (
    <section
      role="listitem"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="overflow-hidden rounded-2xl border border-border bg-card focus-within:ring-2 focus-within:ring-[var(--gold)]/50"
    >
      <div className="flex items-start gap-4 p-5">
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-muted text-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div id={titleId} className="font-medium">{catalog.title}</div>
            {enrolled?.isDefault && (
              <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
                <Star aria-hidden="true" className="h-3 w-3" /> Mặc định
              </Badge>
            )}
            {enrolled && (
              <Badge className="h-5 gap-1 bg-[color-mix(in_oklab,var(--up)_15%,transparent)] text-[var(--up)] text-[10px] hover:bg-[color-mix(in_oklab,var(--up)_15%,transparent)]">
                <Check aria-hidden="true" className="h-3 w-3" /> Đã bật
              </Badge>
            )}
            {!catalog.available && (
              <Badge variant="outline" className="h-5 text-[10px]">
                Sắp ra mắt
              </Badge>
            )}
          </div>
          <span id={descId} className="sr-only">
            {catalog.a11yDesc} Trạng thái: {statusBits}.
          </span>
          {catalog.desc && (
            <p className="mt-1 text-xs text-muted-foreground">{catalog.desc}</p>
          )}
          {enrolled?.enrolledAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Đã bật từ {new Date(enrolled.enrolledAt).toLocaleString("vi-VN")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {enrolled && !enrolled.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetDefault(enrolled.id)}
            >
              <Star aria-hidden="true" className="h-4 w-4" />
            </Button>
          )}
          {catalog.available ? (
            <Button
              variant={enrolled ? "outline" : "default"}
              size="sm"
              onClick={onToggle}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              className={enrolled ? "" : "bg-gold-gradient text-[var(--gold-foreground)]"}
            >
              {enrolled ? (
                <>{isExpanded ? "Đóng" : <><Trash2 aria-hidden="true" className="mr-1 h-3.5 w-3.5" /> Quản lý</>}</>
              ) : (
                <>{isExpanded ? "Đóng" : <><Plus aria-hidden="true" className="mr-1 h-3.5 w-3.5" /> Thêm</>}</>
              )}
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              Sắp ra mắt
            </Button>
          )}
        </div>
      </div>

      {isExpanded && catalog.available && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={titleId}
          className="border-t border-border bg-background/30 p-5"
        >
          {catalog.type === "totp" && (
            <TotpPanel
              enrolled={!!enrolled}
              onChange={onChange}
              onBackupCodes={onBackupCodes}
              onClose={onToggle}
            />
          )}
          {catalog.type === "email_otp" && (
            <EmailOtpPanel
              enrolled={enrolled}
              onChange={onChange}
              onClose={onToggle}
            />
          )}
          {catalog.type === "magic_link" && (
            <MagicLinkPanel
              enrolled={enrolled}
              onChange={onChange}
              onClose={onToggle}
            />
          )}
          {catalog.type === "passkey" && (
            <PasskeyPanel
              enrolled={enrolled}
              onChange={onChange}
              onClose={onToggle}
            />
          )}
          {catalog.type === "recovery_codes" && (
            <RecoveryCodesPanel
              onBackupCodes={onBackupCodes}
              onClose={onToggle}
            />
          )}
        </div>
      )}
    </section>
  );
}

/* -------------------- TOTP enrol/disable panel -------------------- */

function TotpPanel({
  enrolled,
  onChange,
  onBackupCodes,
  onClose,
}: {
  enrolled: boolean;
  onChange: () => void;
  onBackupCodes: (codes: string[]) => void;
  onClose: () => void;
}) {
  const startEnroll = useServerFn(startMfaEnrollment);
  const confirmEnroll = useServerFn(confirmMfaEnrollment);
  const disable = useServerFn(disableMfa);
  const status = useServerFn(getMfaStatus);

  const [busy, setBusy] = useState(false);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");

  // Auto-start enrollment when opening for a non-enrolled user
  useEffect(() => {
    let cancelled = false;
    if (!enrolled && !otpauthUri) {
      (async () => {
        // Make sure server has clean state
        await status().catch(() => {});
        if (cancelled) return;
        setBusy(true);
        try {
          const res = await startEnroll();
          if (cancelled) return;
          setOtpauthUri(res.otpauthUri);
          setSecret(res.secret);
        } catch (e: any) {
          toast.error("Không bắt đầu được", { description: e?.message });
        } finally {
          if (!cancelled) setBusy(false);
        }
      })();
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onConfirm() {
    setBusy(true);
    try {
      const res = await confirmEnroll({ data: { code: code.trim() } });
      setCode("");
      setOtpauthUri(null);
      setSecret(null);
      onChange();
      onBackupCodes(res.backupCodes);
      toast.success("Đã bật Authenticator app");
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
      onChange();
      onClose();
      toast.success("Đã tắt Authenticator app");
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

  if (enrolled) {
    return (
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tắt Authenticator app</Label>
        <p className="text-xs text-muted-foreground">
          Nhập mã 6 chữ số từ ứng dụng xác thực (hoặc mã dự phòng dạng <code>abcde-fghij</code>) để xác nhận.
        </p>
        <div className="flex gap-2">
          <Input
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="h-10 font-mono"
          />
          <Button onClick={onDisable} disabled={busy || disableCode.length < 6} variant="destructive">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
            <span className="ml-2">Tắt</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
      <div className="rounded-xl border border-border bg-white p-4 mx-auto">
        {otpauthUri ? (
          <QRCodeSVG value={otpauthUri} size={180} level="M" />
        ) : (
          <div className="grid h-[180px] w-[180px] place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Bước 1 · Quét QR bằng Google Authenticator / Authy / 1Password
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">Không quét được? Nhập tay khoá bí mật:</p>
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
            Bước 2 · Nhập mã 6 chữ số từ app
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
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Xác minh & bật
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Email OTP enrol/remove panel -------------------- */

function EmailOtpPanel({
  enrolled,
  onChange,
  onClose,
}: {
  enrolled: MfaMethodSummary | undefined;
  onChange: () => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const startEnroll = useServerFn(startEmailOtpEnrollment);
  const confirmEnroll = useServerFn(confirmEmailOtpEnrollment);
  const remove = useServerFn(removeMfaMethod);

  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(user?.email ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function onSend() {
    setBusy(true);
    try {
      const res = await startEnroll({ data: { email: email.trim() } });
      setSentTo(res.maskedEmail);
      setStep("code");
      toast.success("Đã gửi mã", { description: `Kiểm tra hộp thư ${res.maskedEmail}` });
    } catch (e: any) {
      toast.error("Không gửi được mã", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    setBusy(true);
    try {
      await confirmEnroll({ data: { code: code.trim() } });
      setCode("");
      setStep("email");
      setSentTo(null);
      onChange();
      onClose();
      toast.success("Đã bật Email OTP");
    } catch (e: any) {
      toast.error("Xác minh thất bại", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!enrolled) return;
    setBusy(true);
    try {
      await remove({ data: { methodId: enrolled.id } });
      onChange();
      onClose();
      toast.success("Đã gỡ Email OTP");
    } catch (e: any) {
      toast.error("Không gỡ được", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  if (enrolled) {
    return (
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gỡ Email OTP</Label>
        <p className="text-xs text-muted-foreground">
          Email <span className="font-mono">{enrolled.label}</span> sẽ không còn nhận mã xác thực.
        </p>
        <div className="flex gap-2">
          <Button onClick={onRemove} disabled={busy} variant="destructive" size="sm">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
            Gỡ phương thức
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Đóng</Button>
        </div>
      </div>
    );
  }

  if (step === "email") {
    return (
      <div className="space-y-3">
        <div>
          <Label htmlFor="email-otp-addr" className="text-xs uppercase tracking-wider text-muted-foreground">
            Bước 1 · Nhập email nhận mã
          </Label>
          <Input
            id="email-otp-addr"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@gmail.com"
            autoComplete="email"
            className="mt-1 h-10"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Bạn có thể dùng email khác email tài khoản. Mã có hiệu lực vài phút.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onSend}
            disabled={busy || !email.includes("@")}
            className="bg-gold-gradient text-[var(--gold-foreground)]"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Gửi mã
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="email-otp-code" className="text-xs uppercase tracking-wider text-muted-foreground">
          Bước 2 · Nhập mã 6 chữ số đã gửi tới {sentTo}
        </Label>
        <Input
          id="email-otp-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="mt-1 h-11 text-center font-mono text-lg tracking-[0.4em]"
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onConfirm}
          disabled={busy || code.length !== 6}
          className="bg-gold-gradient text-[var(--gold-foreground)]"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
          Xác minh & bật
        </Button>
        <Button variant="ghost" onClick={() => { setStep("email"); setCode(""); }} disabled={busy}>
          Gửi lại
        </Button>
      </div>
    </div>
  );
}

function BackupCodesPanel({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  function downloadTxt() {
    const blob = new Blob(
      [`MarketWatch — Mã dự phòng 2FA\nLưu file này ở nơi an toàn.\nMỗi mã chỉ dùng được 1 lần.\n\n${codes.join("\n")}\n`],
      { type: "text/plain" },
    );
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marketwatch-backup-codes.txt";
    a.click();
    window.URL.revokeObjectURL(url);
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

/* -------------------- Magic Link panel -------------------- */

function MagicLinkPanel({
  enrolled,
  onChange,
  onClose,
}: {
  enrolled: MfaMethodSummary | undefined;
  onChange: () => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const startEnroll = useServerFn(startMagicLinkEnrollment);
  const checkEnroll = useServerFn(checkMagicLinkEnrollment);
  const remove = useServerFn(removeMfaMethod);

  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"email" | "waiting">("email");
  const [email, setEmail] = useState(user?.email ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Poll for verification while waiting
  useEffect(() => {
    if (step !== "waiting") return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        const res = await checkEnroll();
        if (cancelled) return;
        if (res.verified) {
          onChange();
          onClose();
          toast.success("Đã bật Magic Link");
          return;
        }
      } catch { /* keep polling */ }
      if (attempts < 100 && !cancelled) {
        setTimeout(tick, 3000);
      }
    };
    const t = setTimeout(tick, 3000);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function onSend() {
    setBusy(true);
    try {
      const res = await startEnroll({ data: { email: email.trim() } });
      setSentTo(res.maskedEmail);
      setStep("waiting");
      toast.success("Đã gửi link", { description: `Mở email ${res.maskedEmail} và bấm vào link.` });
    } catch (e: any) {
      toast.error("Không gửi được link", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!enrolled) return;
    setBusy(true);
    try {
      await remove({ data: { methodId: enrolled.id } });
      onChange();
      onClose();
      toast.success("Đã gỡ Magic Link");
    } catch (e: any) {
      toast.error("Không gỡ được", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  if (enrolled) {
    return (
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gỡ Magic Link</Label>
        <p className="text-xs text-muted-foreground">
          Email <span className="font-mono">{enrolled.label}</span> sẽ không còn nhận link xác thực.
        </p>
        <div className="flex gap-2">
          <Button onClick={onRemove} disabled={busy} variant="destructive" size="sm">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
            Gỡ phương thức
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Đóng</Button>
        </div>
      </div>
    );
  }

  if (step === "waiting") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <div className="text-sm">
            <div className="font-medium">Đang chờ bạn bấm link…</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Đã gửi tới {sentTo}. Mở email và bấm link xác nhận. Trang này sẽ tự cập nhật.
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setStep("email"); }}>
            Đổi email / gửi lại
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Đóng</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="ml-addr" className="text-xs uppercase tracking-wider text-muted-foreground">
          Email nhận link xác thực
        </Label>
        <Input
          id="ml-addr"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@gmail.com"
          autoComplete="email"
          className="mt-1 h-10"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Mỗi lần xác thực, MarketWatch sẽ gửi 1 link 1-chạm tới email này.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onSend}
          disabled={busy || !email.includes("@")}
          className="bg-gold-gradient text-[var(--gold-foreground)]"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Gửi link xác thực
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
      </div>
    </div>
  );
}

/* -------------------- Passkey panel -------------------- */

function authsignalBrowserBaseUrl(region: string): string {
  const r = (region || "us").toLowerCase().trim();
  const host = r === "us" ? "api.authsignal.com" : `${r}.api.authsignal.com`;
  return `https://${host}/v1`;
}

function PasskeyPanel({
  enrolled,
  onChange,
  onClose,
}: {
  enrolled: MfaMethodSummary | undefined;
  onChange: () => void;
  onClose: () => void;
}) {
  const startEnroll = useServerFn(startPasskeyEnrollment);
  const confirmEnroll = useServerFn(confirmPasskeyEnrollment);
  const remove = useServerFn(removeMfaMethod);

  const [busy, setBusy] = useState(false);

  async function onEnroll() {
    setBusy(true);
    try {
      const init = await startEnroll();
      if (!init.tenantId) {
        throw new Error("Thiếu AUTHSIGNAL_TENANT_ID trên server.");
      }
      const mod = await import("@authsignal/browser");
      const Authsignal = (mod as any).Authsignal ?? (mod as any).default;
      const authsignal = new Authsignal({
        tenantId: init.tenantId,
        baseUrl: authsignalBrowserBaseUrl(init.region),
      });
      const result = await authsignal.passkey.signUp({
        token: init.token,
        username: init.username,
        displayName: init.displayName,
      });
      const verifiedToken: string | undefined = result?.token ?? result?.data?.token;
      if (!verifiedToken) {
        throw new Error(result?.error ?? "Không tạo được passkey.");
      }
      await confirmEnroll({ data: { token: verifiedToken } });
      onChange();
      onClose();
      toast.success("Đã bật Passkey");
    } catch (e: any) {
      const msg = e?.message || "Đã có lỗi xảy ra";
      // Người dùng có thể đã huỷ prompt — giảm tiếng ồn.
      if (/cancel|aborted|not allowed/i.test(msg)) {
        toast.message("Đã huỷ tạo passkey");
      } else {
        toast.error("Tạo passkey thất bại", { description: msg });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!enrolled) return;
    setBusy(true);
    try {
      await remove({ data: { methodId: enrolled.id } });
      onChange();
      onClose();
      toast.success("Đã gỡ Passkey");
    } catch (e: any) {
      toast.error("Không gỡ được", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  if (enrolled) {
    return (
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gỡ Passkey</Label>
        <p className="text-xs text-muted-foreground">
          Passkey <span className="font-mono">{enrolled.label}</span> sẽ bị xoá khỏi tài khoản. Bạn vẫn có thể tạo lại sau.
        </p>
        <div className="flex gap-2">
          <Button onClick={onRemove} disabled={busy} variant="destructive" size="sm">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
            Gỡ Passkey
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Đóng</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        Trình duyệt sẽ hỏi bạn xác nhận bằng Face ID / Touch ID / Windows Hello hoặc khoá bảo mật (YubiKey). Passkey được lưu an toàn trên thiết bị của bạn.
      </div>
      <div className="flex gap-2">
        <Button onClick={onEnroll} disabled={busy} className="bg-gold-gradient text-[var(--gold-foreground)]">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
          Tạo Passkey
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
      </div>
    </div>
  );
}
/* -------------------- Recovery codes panel -------------------- */

function RecoveryCodesPanel({
  onBackupCodes,
  onClose,
}: {
  onBackupCodes: (codes: string[]) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const getStatus = useServerFn(getRecoveryCodesStatus);
  const regenerate = useServerFn(regenerateBackupCodes);

  const { data: status, isLoading } = useQuery({
    queryKey: ["recovery-codes-status", user?.id],
    queryFn: () => getStatus(),
    enabled: !!user,
  });

  const [busy, setBusy] = useState(false);
  const [needsStepUp, setNeedsStepUp] = useState(false);

  async function doRegenerate(stepUpToken?: string) {
    setBusy(true);
    try {
      const res = await regenerate({ data: { stepUpToken } });
      onBackupCodes(res.backupCodes);
      onClose();
      toast.success("Đã tạo lại mã dự phòng");
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (/xác minh 2 lớp/i.test(msg)) {
        setNeedsStepUp(true);
      } else {
        toast.error("Không tạo lại được", { description: msg });
      }
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }

  if (!status?.hasTotp) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          Mã dự phòng chỉ khả dụng khi bạn đã bật <b>Authenticator app</b>. Hãy bật phương thức đó trước.
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Đóng</Button>
      </div>
    );
  }

  if (needsStepUp) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          Xác minh 2 lớp một lần nữa để tạo lại mã dự phòng. Mã cũ sẽ ngừng hoạt động ngay sau khi xác nhận.
        </div>
        <MfaStepUpForm
          submitLabel="Xác minh & tạo mã mới"
          username={user?.email}
          onVerified={async (token) => {
            setNeedsStepUp(false);
            await doRegenerate(token);
          }}
        />
        <Button variant="ghost" size="sm" onClick={() => setNeedsStepUp(false)} disabled={busy}>
          Huỷ
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <div className="font-medium">
          Còn <span className="font-mono">{status.remaining}</span> / 8 mã chưa dùng
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Mỗi mã chỉ dùng được 1 lần. Khi sắp hết hoặc lo bị lộ, hãy tạo lại bộ mới — bộ cũ sẽ ngừng hoạt động ngay lập tức.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => doRegenerate()}
          disabled={busy}
          className="bg-gold-gradient text-[var(--gold-foreground)]"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Tạo lại 8 mã mới
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Đóng</Button>
      </div>
    </div>
  );
}
