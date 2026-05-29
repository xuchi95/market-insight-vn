import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck, ShieldOff, Loader2, Copy, KeyRound, Smartphone,
  Mail, MessageSquare, Link2, Fingerprint, Check, Star, Trash2, Plus,
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
  type MfaMethodType,
  type MfaMethodSummary,
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

  const listMethods = useServerFn(listMfaMethods);
  const setDefault = useServerFn(setDefaultMfaMethod);

  const { data: mfaData, isLoading } = useQuery({
    queryKey: ["mfa-methods", user?.id],
    queryFn: () => listMethods(),
    enabled: !!user,
  });

  const [activePanel, setActivePanel] = useState<MfaMethodType | null>(null);
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
    type: MfaMethodType;
    title: string;
    desc: string;
    icon: any;
    available: boolean;
    soon?: string;
  }> = [
    { type: "totp", title: "Authenticator app", desc: "Google Authenticator, Authy, 1Password — mã 6 chữ số đổi mỗi 30 giây.", icon: Smartphone, available: true },
    { type: "email_otp", title: "Email OTP", desc: "Gửi mã 6 chữ số tới email của bạn.", icon: Mail, available: true },
    { type: "magic_link", title: "Magic Link", desc: "Bấm vào link trong email để xác thực, không cần nhập mã.", icon: Link2, available: false, soon: "PR3" },
    { type: "passkey", title: "Passkey", desc: "Face ID / Touch ID / Windows Hello — không cần mật khẩu.", icon: Fingerprint, available: false, soon: "PR3" },
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
          <p className="mt-2 text-sm text-muted-foreground">
            Thêm 1 hoặc nhiều phương thức xác thực 2 lớp để bảo vệ tài khoản. Khi đăng nhập hoặc thực hiện hành động nhạy cảm, bạn sẽ được hỏi thêm 1 lớp xác minh.
          </p>
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
            <div className="space-y-3">
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
    type: MfaMethodType;
    title: string;
    desc: string;
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
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-4 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-muted text-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-medium">{catalog.title}</div>
            {enrolled?.isDefault && (
              <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
                <Star className="h-3 w-3" /> Mặc định
              </Badge>
            )}
            {enrolled && (
              <Badge className="h-5 gap-1 bg-[color-mix(in_oklab,var(--up)_15%,transparent)] text-[var(--up)] text-[10px] hover:bg-[color-mix(in_oklab,var(--up)_15%,transparent)]">
                <Check className="h-3 w-3" /> Đã bật
              </Badge>
            )}
            {!catalog.available && (
              <Badge variant="outline" className="h-5 text-[10px]">
                Sắp ra mắt
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{catalog.desc}</p>
          {enrolled?.enrolledAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Đã bật từ {new Date(enrolled.enrolledAt).toLocaleString("vi-VN")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {enrolled && !enrolled.isDefault && (
            <Button variant="ghost" size="sm" onClick={() => onSetDefault(enrolled.id)} title="Đặt làm mặc định">
              <Star className="h-4 w-4" />
            </Button>
          )}
          {catalog.available ? (
            <Button
              variant={enrolled ? "outline" : "default"}
              size="sm"
              onClick={onToggle}
              className={enrolled ? "" : "bg-gold-gradient text-[var(--gold-foreground)]"}
            >
              {enrolled ? (
                <>{isExpanded ? "Đóng" : <><Trash2 className="mr-1 h-3.5 w-3.5" /> Quản lý</>}</>
              ) : (
                <>{isExpanded ? "Đóng" : <><Plus className="mr-1 h-3.5 w-3.5" /> Thêm</>}</>
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
        <div className="border-t border-border bg-background/30 p-5">
          {catalog.type === "totp" && (
            <TotpPanel
              enrolled={!!enrolled}
              onChange={onChange}
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