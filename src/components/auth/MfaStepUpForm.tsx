import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2, ShieldCheck, Smartphone, Mail, Link2, Fingerprint, Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  listEnrolledMfaMethods,
  startStepUp,
  verifyStepUp,
  type EnrolledMethod,
} from "@/lib/mfa.functions";

function methodIcon(t: EnrolledMethod["type"]) {
  switch (t) {
    case "totp": return Smartphone;
    case "email_otp": return Mail;
    case "magic_link": return Link2;
    case "passkey": return Fingerprint;
    default: return ShieldCheck;
  }
}
function methodTitle(t: EnrolledMethod["type"]) {
  switch (t) {
    case "totp": return "Authenticator app";
    case "email_otp": return "Email OTP";
    case "magic_link": return "Magic Link";
    case "passkey": return "Passkey";
    default: return t;
  }
}

function authsignalBrowserBaseUrl(region: string): string {
  const r = (region || "us").toLowerCase().trim();
  const host = r === "us" ? "api.authsignal.com" : `${r}.api.authsignal.com`;
  return `https://${host}/v1`;
}

export function MfaStepUpForm({
  onVerified,
  submitLabel = "Xác minh",
  username,
}: {
  onVerified: (stepUpToken: string) => void | Promise<void>;
  submitLabel?: string;
  /** Username for passkey signIn (usually current user email). */
  username?: string;
}) {
  const list = useServerFn(listEnrolledMfaMethods);
  const start = useServerFn(startStepUp);
  const verify = useServerFn(verifyStepUp);

  const { data, isLoading } = useQuery({
    queryKey: ["mfa-enrolled-methods"],
    queryFn: () => list(),
    staleTime: 30_000,
  });

  const methods = data?.methods ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = methods.find((m) => m.id === selectedId) ?? null;

  // Auto-pick the default (first) method when methods load.
  useEffect(() => {
    if (!selectedId && methods.length > 0) setSelectedId(methods[0].id);
  }, [methods, selectedId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải phương thức…
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Tài khoản chưa bật phương thức xác minh 2 lớp nào.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {methods.length > 1 && (
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Phương thức xác minh
          </Label>
          <div className="mt-2 grid gap-2">
            {methods.map((m) => {
              const Icon = methodIcon(m.type);
              const active = m.id === selectedId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_8%,transparent)]"
                      : "border-border bg-card hover:border-[var(--gold)]/40"
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-md border border-border bg-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{methodTitle(m.type)}</div>
                    {m.label && (
                      <div className="truncate text-[11px] text-muted-foreground font-mono">{m.label}</div>
                    )}
                  </div>
                  {m.isDefault && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mặc định</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <MethodChallenge
          key={selected.id}
          method={selected}
          username={username}
          tenantId={data?.passkeyTenantId ?? ""}
          region={data?.region ?? "us"}
          submitLabel={submitLabel}
          onVerify={async ({ code, token }) => {
            const res = await verify({
              data: { methodId: selected.id, code, token },
            });
            await onVerified(res.stepUpToken);
          }}
          start={async () => {
            return await start({ data: { methodId: selected.id } });
          }}
        />
      )}
    </div>
  );
}

function MethodChallenge({
  method,
  username,
  tenantId,
  region,
  submitLabel,
  onVerify,
  start,
}: {
  method: EnrolledMethod;
  username?: string;
  tenantId: string;
  region: string;
  submitLabel: string;
  onVerify: (args: { code?: string; token?: string }) => Promise<void>;
  start: () => Promise<any>;
}) {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const startedRef = useRef(false);

  // For email_otp & magic_link: kick off the challenge once on mount.
  useEffect(() => {
    if (startedRef.current) return;
    if (method.type !== "email_otp" && method.type !== "magic_link") return;
    startedRef.current = true;
    (async () => {
      setBusy(true);
      try {
        await start();
        setSent(true);
        if (method.type === "magic_link") setWaiting(true);
      } catch (e: any) {
        toast.error("Không gửi được mã", { description: e?.message });
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method.id]);

  // Magic-link polling
  useEffect(() => {
    if (!waiting) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        await onVerify({});
        return;
      } catch {
        if (attempts < 100 && !cancelled) setTimeout(tick, 3000);
      }
    };
    const t = setTimeout(tick, 3000);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  async function onResend() {
    setBusy(true);
    try {
      await start();
      setSent(true);
      toast.success("Đã gửi lại");
    } catch (e: any) {
      toast.error("Không gửi được", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onVerify({ code: code.trim() });
    } catch (e: any) {
      toast.error("Không xác minh được", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function onPasskey() {
    setBusy(true);
    try {
      const init = await start();
      if (!init?.token) throw new Error("Không lấy được token passkey.");
      const mod = await import("@authsignal/browser");
      const Authsignal = (mod as any).Authsignal ?? (mod as any).default;
      const authsignal = new Authsignal({
        tenantId,
        baseUrl: authsignalBrowserBaseUrl(region),
      });
      const result = await authsignal.passkey.signIn({ token: init.token });
      const verifiedToken: string | undefined = result?.token ?? result?.data?.token;
      if (!verifiedToken) throw new Error(result?.error ?? "Không xác minh được passkey.");
      await onVerify({ token: verifiedToken });
    } catch (e: any) {
      const msg = e?.message || "Đã có lỗi xảy ra";
      if (/cancel|aborted|not allowed/i.test(msg)) {
        toast.message("Đã huỷ xác minh passkey");
      } else {
        toast.error("Passkey thất bại", { description: msg });
      }
    } finally {
      setBusy(false);
    }
  }

  if (method.type === "passkey") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Trình duyệt sẽ hỏi bạn xác nhận bằng Face ID / Touch ID / Windows Hello.
        </div>
        <Button
          type="button"
          onClick={onPasskey}
          disabled={busy}
          className="h-11 w-full bg-gold-gradient text-[var(--gold-foreground)]"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
          {submitLabel} bằng Passkey
        </Button>
        {/* username is only relevant for passkey signUp; signIn doesn't need it */}
        {void username}
      </div>
    );
  }

  if (method.type === "magic_link") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            {sent
              ? <>Đã gửi link xác minh tới <span className="font-mono">{method.label}</span>. Mở email và bấm link — trang này sẽ tự cập nhật.</>
              : <>Đang gửi link xác minh…</>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onResend} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
            Gửi lại link
          </Button>
        </div>
      </div>
    );
  }

  // TOTP & Email OTP — enter 6-digit code
  return (
    <form onSubmit={onSubmitOtp} className="space-y-3">
      <div>
        <Label htmlFor="mfa-code" className="text-xs uppercase tracking-wider text-muted-foreground">
          {method.type === "totp"
            ? "Mã 6 chữ số từ ứng dụng xác thực"
            : <>Mã 6 chữ số đã gửi tới <span className="font-mono normal-case tracking-normal">{method.label}</span></>}
        </Label>
        <Input
          id="mfa-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          className="mt-1 h-12 text-center font-mono text-xl tracking-[0.4em]"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={busy || code.length !== 6}
          className="h-11 flex-1 bg-gold-gradient text-[var(--gold-foreground)]"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          {submitLabel}
        </Button>
        {method.type === "email_otp" && (
          <Button type="button" variant="ghost" onClick={onResend} disabled={busy} className="h-11">
            Gửi lại
          </Button>
        )}
      </div>
      {sent && method.type === "email_otp" && (
        <p className="text-[11px] text-muted-foreground">
          Không thấy mã? Kiểm tra thư mục Spam, hoặc bấm "Gửi lại".
        </p>
      )}
    </form>
  );
}