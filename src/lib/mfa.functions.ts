import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";


// --- Authsignal REST client (called directly from server — no Lovable AI Gateway, no Cloud credit) ---

function authsignalBaseUrl(): string {
  const raw = (process.env.AUTHSIGNAL_REGION || "us").toLowerCase().trim();
  const normalized = raw.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const regionMap: Record<string, string> = {
    "us": "us",
    "us oregon": "us",
    "eu": "eu",
    "eu ireland": "eu",
    "au": "au",
    "au sydney": "au",
    "ap southeast": "au",
    "ap southeast sydney": "au",
    "ap-southeast": "au",
    "ap-southeast-sydney": "au",
    "sydney": "au",
  };
  const region = regionMap[normalized] ?? (/^[a-z]{2,3}$/.test(normalized) ? normalized : "us");
  // Authsignal Server API: US dùng api.authsignal.com; các region khác có prefix (au/eu/ca).
  const host = region === "us" ? "api.authsignal.com" : `${region}.api.authsignal.com`;
  return `https://${host}/v1`;
}

function authsignalAuthHeader(): string {
  const secret = process.env.AUTHSIGNAL_API_SECRET;
  if (!secret) {
    throw new Error("Authsignal chưa được cấu hình (thiếu AUTHSIGNAL_API_SECRET).");
  }
  // Authsignal Server API Basic auth: secret key làm username, password để trống.
  const token = Buffer.from(`${secret}:`).toString("base64");
  return `Basic ${token}`;
}

async function authsignalFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${authsignalBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Authorization": authsignalAuthHeader(),
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!res.ok) {
    const msg = typeof body === "object" && body?.errorDescription
      ? body.errorDescription
      : typeof body === "object" && body?.error
        ? body.error
        : `Authsignal API lỗi ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const buf = new Uint8Array(5);
    crypto.getRandomValues(buf);
    const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
    codes.push(`${hex.slice(0, 5)}-${hex.slice(5, 10)}`);
  }
  return codes;
}

// Base32 (RFC 4648, no padding) encoder for TOTP secret.
function base32Encode(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += alphabet[(value << (5 - bits)) & 31];
  }
  return out;
}

function generateTotpSecret(): string {
  const buf = new Uint8Array(20); // 160-bit
  crypto.getRandomValues(buf);
  return base32Encode(buf);
}

function buildOtpauthUri(secret: string, label: string, issuer: string): string {
  const encLabel = encodeURIComponent(`${issuer}:${label}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encLabel}?${params.toString()}`;
}

// Base32 (RFC 4648) decoder for TOTP secrets stored in DB.
function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/=+$/g, "").toUpperCase().replace(/\s+/g, "");
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx < 0) throw new Error("TOTP secret không hợp lệ.");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function hotp(keyBytes: Uint8Array, counter: number): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
  const offset = sig[sig.length - 1] & 0x0f;
  const code =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

/** Verify a 6-digit TOTP code locally with ±1 step window (30s default). */
async function verifyTotpCode(secret: string, code: string, window = 1): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    const c = await hotp(key, step + w);
    if (c === code) return true;
  }
  return false;
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code.toLowerCase().trim());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* -------------------- Step-up token (HMAC) -------------------- */

const STEP_UP_TTL_SEC = 5 * 60;

function stepUpSecret(): string {
  const s = process.env.AUTHSIGNAL_API_SECRET;
  if (!s) throw new Error("Thiếu AUTHSIGNAL_API_SECRET để ký step-up token.");
  return s;
}

function b64urlEncode(buf: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return new Uint8Array(sig);
}

export async function issueStepUpToken(userId: string, methodType: string, ttlSec = STEP_UP_TTL_SEC): Promise<string> {
  const payload = JSON.stringify({
    sub: userId,
    m: methodType,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  });
  const p = b64urlEncode(new TextEncoder().encode(payload));
  const sig = await hmacSha256(stepUpSecret(), p);
  return `${p}.${b64urlEncode(sig)}`;
}

export async function verifyStepUpToken(token: string | undefined | null, userId: string): Promise<boolean> {
  if (!token) return false;
  const [p, sigB64] = token.split(".");
  if (!p || !sigB64) return false;
  const [expected, got] = await Promise.all([
    hmacSha256(stepUpSecret(), p),
    b64urlDecode(sigB64),
  ]);
  if (got.length !== expected.length) return false;
  if (!timingSafeEqual(got, expected)) return false;
  let obj: any;
  try { obj = JSON.parse(new TextDecoder().decode(b64urlDecode(p))); } catch { return false; }
  if (obj?.sub !== userId) return false;
  if (typeof obj?.exp !== "number" || obj.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export async function userHasEnrolledMfa(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_mfa_methods")
    .select("id")
    .eq("user_id", userId)
    .eq("enrolled", true)
    .limit(1);
  return !!(data && data.length > 0);
}

/**
 * Ensures the caller has stepped up with MFA recently. Throws if the user
 * has any enrolled MFA method and the token is missing/invalid/expired.
 */
export async function requireStepUp(userId: string, token: string | undefined | null): Promise<void> {
  const hasMfa = await userHasEnrolledMfa(userId);
  if (!hasMfa) return; // nothing to enforce
  if (!(await verifyStepUpToken(token, userId))) {
    throw new Error("Bạn cần xác minh 2 lớp trước khi thực hiện hành động này.");
  }
}

// --- Server functions ---

export const getMfaStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("user_mfa")
      .select("enrolled, enrolled_at, authenticator_id")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      enrolled: !!data?.enrolled,
      enrolledAt: data?.enrolled_at ?? null,
      pending: !!data && !data.enrolled,
    };
  });

export const startMfaEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    // Get user email for label in authenticator app
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const email = profile?.email ?? "user@marketwatch.vn";

    // Block if already fully enrolled
    const { data: existing } = await supabaseAdmin
      .from("user_mfa")
      .select("enrolled, authsignal_user_id, authenticator_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing?.enrolled) {
      throw new Error("Tài khoản đã bật 2FA. Hãy tắt trước khi đăng ký lại.");
    }

    const authsignalUserId = existing?.authsignal_user_id ?? userId;

    // If there is a leftover authenticator from a previous incomplete attempt, remove it.
    if (existing?.authenticator_id) {
      try {
        await authsignalFetch(
          `/users/${encodeURIComponent(authsignalUserId)}/authenticators/${encodeURIComponent(existing.authenticator_id)}`,
          { method: "DELETE" },
        );
      } catch { /* ignore */ }
    }

    // Generate the TOTP secret + otpauth URI ourselves; Authsignal's
    // "Enroll verified authenticator" endpoint requires us to supply otpUri.
    const secret = generateTotpSecret();
    const otpauthUri = buildOtpauthUri(secret, email, "MarketWatch");

    const enrollResp = await authsignalFetch(
      `/users/${encodeURIComponent(authsignalUserId)}/authenticators`,
      {
        method: "POST",
        body: JSON.stringify({
          verificationMethod: "AUTHENTICATOR_APP",
          otpUri: otpauthUri,
        }),
      },
    );

    const authenticator = enrollResp?.authenticator ?? enrollResp;
    const authenticatorId: string | undefined =
      authenticator?.userAuthenticatorId || authenticator?.authenticatorId || enrollResp?.userAuthenticatorId;

    if (!authenticatorId) {
      throw new Error("Không nhận được authenticatorId từ Authsignal.");
    }

    // Persist pending enrollment
    await supabaseAdmin.from("user_mfa").upsert({
      user_id: userId,
      authsignal_user_id: authsignalUserId,
      authenticator_id: authenticatorId,
      enrolled: false,
    }, { onConflict: "user_id" });

    // Also persist in the new multi-method table (pending)
    await supabaseAdmin
      .from("user_mfa_methods")
      .delete()
      .eq("user_id", userId)
      .eq("type", "totp")
      .eq("enrolled", false);
    await supabaseAdmin.from("user_mfa_methods").insert({
      user_id: userId,
      type: "totp",
      authsignal_user_id: authsignalUserId,
      authenticator_id: authenticatorId,
      label: "Authenticator app",
      enrolled: false,
    });

    return { otpauthUri, secret: secret ?? null };
  });

const VerifyEnrollSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Mã 6 chữ số"),
});

export const confirmMfaEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VerifyEnrollSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("user_mfa")
      .select("authsignal_user_id, authenticator_id, enrolled")
      .eq("user_id", userId)
      .maybeSingle();
    if (!row?.authenticator_id) {
      throw new Error("Chưa có thiết bị đăng ký. Hãy bắt đầu lại.");
    }
    if (row.enrolled) {
      throw new Error("Đã đăng ký xong rồi.");
    }

    const verifyResp = await authsignalFetch(
      `/users/${encodeURIComponent(row.authsignal_user_id)}/authenticators/verify`,
      {
        method: "POST",
        body: JSON.stringify({
          verificationCode: data.code,
          authenticatorId: row.authenticator_id,
        }),
      },
    );
    const isVerified = verifyResp?.isVerified ?? verifyResp?.verified ?? false;
    if (!isVerified) {
      throw new Error("Mã không đúng. Hãy kiểm tra lại đồng hồ điện thoại và thử lại.");
    }

    const backupCodes = generateBackupCodes();
    const hashed = await Promise.all(backupCodes.map(hashCode));

    await supabaseAdmin
      .from("user_mfa")
      .update({
        enrolled: true,
        enrolled_at: new Date().toISOString(),
        backup_codes: hashed,
      })
      .eq("user_id", userId);

    // Sync the new table
    const now = new Date().toISOString();
    const { data: anyEnrolled } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id")
      .eq("user_id", userId)
      .eq("enrolled", true)
      .limit(1);
    const shouldBeDefault = !anyEnrolled || anyEnrolled.length === 0;
    await supabaseAdmin
      .from("user_mfa_methods")
      .update({
        enrolled: true,
        enrolled_at: now,
        is_default: shouldBeDefault,
      })
      .eq("user_id", userId)
      .eq("type", "totp")
      .eq("authenticator_id", row.authenticator_id);

    return { backupCodes };
  });

const VerifyLoginSchema = z.object({
  code: z.string().trim().min(6).max(20),
});

export const verifyMfaChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VerifyLoginSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("user_mfa")
      .select("authsignal_user_id, authenticator_id, enrolled, backup_codes")
      .eq("user_id", userId)
      .maybeSingle();
    if (!row?.enrolled || !row.authenticator_id) {
      // No MFA configured — nothing to verify.
      return { ok: true, usedBackup: false };
    }

    const code = data.code.trim();

    // Backup code path (contains a dash)
    if (code.includes("-")) {
      const hashed = await hashCode(code);
      const remaining = (row.backup_codes ?? []).filter((c: string) => c !== hashed);
      if (remaining.length === (row.backup_codes ?? []).length) {
        throw new Error("Mã dự phòng không hợp lệ.");
      }
      await supabaseAdmin
        .from("user_mfa")
        .update({ backup_codes: remaining })
        .eq("user_id", userId);
      return { ok: true, usedBackup: true, remaining: remaining.length };
    }

    if (!/^\d{6}$/.test(code)) {
      throw new Error("Mã phải là 6 chữ số.");
    }

    const verifyResp = await authsignalFetch(
      `/users/${encodeURIComponent(row.authsignal_user_id)}/authenticators/verify`,
      {
        method: "POST",
        body: JSON.stringify({
          verificationCode: code,
          authenticatorId: row.authenticator_id,
        }),
      },
    );
    const isVerified = verifyResp?.isVerified ?? verifyResp?.verified ?? false;
    if (!isVerified) {
      throw new Error("Mã không đúng hoặc đã hết hạn.");
    }
    return { ok: true, usedBackup: false };
  });

export const disableMfa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().trim().min(6).max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("user_mfa")
      .select("authsignal_user_id, authenticator_id, enrolled, backup_codes")
      .eq("user_id", userId)
      .maybeSingle();
    if (!row?.enrolled) {
      throw new Error("2FA chưa được bật.");
    }

    const code = data.code.trim();
    let verified = false;

    if (code.includes("-")) {
      const hashed = await hashCode(code);
      verified = (row.backup_codes ?? []).includes(hashed);
    } else if (/^\d{6}$/.test(code)) {
      const verifyResp = await authsignalFetch(
        `/users/${encodeURIComponent(row.authsignal_user_id)}/authenticators/verify`,
        {
          method: "POST",
          body: JSON.stringify({
            verificationCode: code,
            authenticatorId: row.authenticator_id,
          }),
        },
      );
      verified = verifyResp?.isVerified ?? verifyResp?.verified ?? false;
    }

    if (!verified) {
      throw new Error("Mã không đúng. Không thể tắt 2FA.");
    }

    if (row.authenticator_id) {
      try {
        await authsignalFetch(
          `/users/${encodeURIComponent(row.authsignal_user_id)}/authenticators/${encodeURIComponent(row.authenticator_id)}`,
          { method: "DELETE" },
        );
      } catch { /* ignore upstream errors so user can always disable locally */ }
    }

    await supabaseAdmin.from("user_mfa").delete().eq("user_id", userId);
    await supabaseAdmin
      .from("user_mfa_methods")
      .delete()
      .eq("user_id", userId)
      .eq("type", "totp");
    return { ok: true };
  });

// --- New: list all MFA methods for current user ---

export type MfaMethodType = "totp" | "sms" | "email_otp" | "magic_link" | "passkey";

export interface MfaMethodSummary {
  id: string;
  type: MfaMethodType;
  label: string | null;
  isDefault: boolean;
  enrolled: boolean;
  enrolledAt: string | null;
  createdAt: string;
}

export const listMfaMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    methods: MfaMethodSummary[];
    backupCodesRemaining: number;
  }> => {
    const { userId } = context;
    const { data: rows } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, type, label, is_default, enrolled, enrolled_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const { data: legacy } = await supabaseAdmin
      .from("user_mfa")
      .select("backup_codes")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      methods: (rows ?? []).map((r) => ({
        id: r.id,
        type: r.type as MfaMethodType,
        label: r.label,
        isDefault: r.is_default,
        enrolled: r.enrolled,
        enrolledAt: r.enrolled_at,
        createdAt: r.created_at,
      })),
      backupCodesRemaining: (legacy?.backup_codes ?? []).length,
    };
  });

export const setDefaultMfaMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ methodId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: target } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, enrolled")
      .eq("user_id", userId)
      .eq("id", data.methodId)
      .maybeSingle();
    if (!target?.enrolled) throw new Error("Phương thức chưa được đăng ký.");
    await supabaseAdmin
      .from("user_mfa_methods")
      .update({ is_default: false })
      .eq("user_id", userId);
    await supabaseAdmin
      .from("user_mfa_methods")
      .update({ is_default: true })
      .eq("id", data.methodId);
    return { ok: true };
  });

/* -------------------- Email OTP -------------------- */

function maskEmail(email: string): string {
  const [u, d] = email.split("@");
  if (!u || !d) return email;
  const head = u.slice(0, Math.min(2, u.length));
  return `${head}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
}

const StartEmailOtpSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ").max(254),
});

export const startEmailOtpEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => StartEmailOtpSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const email = data.email.toLowerCase();

    // Reuse existing authsignal_user_id if any (consistent across methods).
    const { data: anyMethod } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("authsignal_user_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const { data: legacy } = await supabaseAdmin
      .from("user_mfa")
      .select("authsignal_user_id")
      .eq("user_id", userId)
      .maybeSingle();
    const authsignalUserId =
      anyMethod?.authsignal_user_id ?? legacy?.authsignal_user_id ?? userId;

    // Block if same email already enrolled
    const { data: existingEnrolled } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, label")
      .eq("user_id", userId)
      .eq("type", "email_otp")
      .eq("enrolled", true);
    if ((existingEnrolled ?? []).some((m) => (m.label ?? "").toLowerCase().includes(email.split("@")[0].slice(0, 2)))) {
      // best-effort dup check (label is masked); allow re-add otherwise
    }

    // Clean up any leftover pending entries for this method
    const { data: pending } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, authenticator_id")
      .eq("user_id", userId)
      .eq("type", "email_otp")
      .eq("enrolled", false);
    for (const p of pending ?? []) {
      if (p.authenticator_id) {
        try {
          await authsignalFetch(
            `/users/${encodeURIComponent(authsignalUserId)}/authenticators/${encodeURIComponent(p.authenticator_id)}`,
            { method: "DELETE" },
          );
        } catch { /* ignore */ }
      }
    }
    await supabaseAdmin
      .from("user_mfa_methods")
      .delete()
      .eq("user_id", userId)
      .eq("type", "email_otp")
      .eq("enrolled", false);

    // Enroll Email OTP — Authsignal sẽ gửi mã qua webhook /api/public/authsignal-email
    const enrollResp = await authsignalFetch(
      `/users/${encodeURIComponent(authsignalUserId)}/authenticators`,
      {
        method: "POST",
        body: JSON.stringify({
          verificationMethod: "EMAIL_OTP",
          email,
        }),
      },
    );
    const authenticator = enrollResp?.authenticator ?? enrollResp;
    const authenticatorId: string | undefined =
      authenticator?.userAuthenticatorId ||
      authenticator?.authenticatorId ||
      enrollResp?.userAuthenticatorId;
    if (!authenticatorId) {
      throw new Error("Không nhận được authenticatorId từ Authsignal.");
    }

    await supabaseAdmin.from("user_mfa_methods").insert({
      user_id: userId,
      type: "email_otp",
      authsignal_user_id: authsignalUserId,
      authenticator_id: authenticatorId,
      label: maskEmail(email),
      enrolled: false,
    });

    return { ok: true, maskedEmail: maskEmail(email) };
  });

const ConfirmEmailOtpSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Mã 6 chữ số"),
});

export const confirmEmailOtpEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ConfirmEmailOtpSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, authsignal_user_id, authenticator_id, enrolled")
      .eq("user_id", userId)
      .eq("type", "email_otp")
      .eq("enrolled", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row?.authenticator_id) {
      throw new Error("Chưa có yêu cầu Email OTP đang chờ. Hãy gửi mã lại.");
    }
    const verifyResp = await authsignalFetch(
      `/users/${encodeURIComponent(row.authsignal_user_id)}/authenticators/verify`,
      {
        method: "POST",
        body: JSON.stringify({
          verificationCode: data.code,
          authenticatorId: row.authenticator_id,
        }),
      },
    );
    const isVerified = verifyResp?.isVerified ?? verifyResp?.verified ?? false;
    if (!isVerified) {
      throw new Error("Mã không đúng hoặc đã hết hạn. Hãy gửi mã lại.");
    }

    const now = new Date().toISOString();
    const { data: anyEnrolled } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id")
      .eq("user_id", userId)
      .eq("enrolled", true)
      .limit(1);
    const shouldBeDefault = !anyEnrolled || anyEnrolled.length === 0;
    await supabaseAdmin
      .from("user_mfa_methods")
      .update({
        enrolled: true,
        enrolled_at: now,
        is_default: shouldBeDefault,
      })
      .eq("id", row.id);

    return { ok: true };
  });

/* -------------------- Generic: remove a method -------------------- */

export const removeMfaMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ methodId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, type, authsignal_user_id, authenticator_id, is_default")
      .eq("user_id", userId)
      .eq("id", data.methodId)
      .maybeSingle();
    if (!row) throw new Error("Không tìm thấy phương thức.");

    // Remove on Authsignal (best-effort)
    if (row.authenticator_id) {
      try {
        await authsignalFetch(
          `/users/${encodeURIComponent(row.authsignal_user_id)}/authenticators/${encodeURIComponent(row.authenticator_id)}`,
          { method: "DELETE" },
        );
      } catch { /* ignore upstream errors */ }
    }

    await supabaseAdmin.from("user_mfa_methods").delete().eq("id", row.id);

    // If TOTP, also clear legacy table
    if (row.type === "totp") {
      await supabaseAdmin.from("user_mfa").delete().eq("user_id", userId);
    }

    // If removed method was default, promote another enrolled one
    if (row.is_default) {
      const { data: nextDefault } = await supabaseAdmin
        .from("user_mfa_methods")
        .select("id")
        .eq("user_id", userId)
        .eq("enrolled", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (nextDefault?.id) {
        await supabaseAdmin
          .from("user_mfa_methods")
          .update({ is_default: true })
          .eq("id", nextDefault.id);
      }
    }

    return { ok: true };
  });

/* -------------------- Magic Link (Email) -------------------- */

const StartMagicLinkSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ").max(254),
});

export const startMagicLinkEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => StartMagicLinkSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const email = data.email.toLowerCase();

    const { data: anyMethod } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("authsignal_user_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const { data: legacy } = await supabaseAdmin
      .from("user_mfa")
      .select("authsignal_user_id")
      .eq("user_id", userId)
      .maybeSingle();
    const authsignalUserId =
      anyMethod?.authsignal_user_id ?? legacy?.authsignal_user_id ?? userId;

    // Clean up pending magic-link entries
    const { data: pending } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, authenticator_id")
      .eq("user_id", userId)
      .eq("type", "magic_link")
      .eq("enrolled", false);
    for (const p of pending ?? []) {
      if (p.authenticator_id) {
        try {
          await authsignalFetch(
            `/users/${encodeURIComponent(authsignalUserId)}/authenticators/${encodeURIComponent(p.authenticator_id)}`,
            { method: "DELETE" },
          );
        } catch { /* ignore */ }
      }
    }
    await supabaseAdmin
      .from("user_mfa_methods")
      .delete()
      .eq("user_id", userId)
      .eq("type", "magic_link")
      .eq("enrolled", false);

    const enrollResp = await authsignalFetch(
      `/users/${encodeURIComponent(authsignalUserId)}/authenticators`,
      {
        method: "POST",
        body: JSON.stringify({
          verificationMethod: "EMAIL_MAGIC_LINK",
          email,
        }),
      },
    );
    const authenticator = enrollResp?.authenticator ?? enrollResp;
    const authenticatorId: string | undefined =
      authenticator?.userAuthenticatorId ||
      authenticator?.authenticatorId ||
      enrollResp?.userAuthenticatorId;
    if (!authenticatorId) {
      throw new Error("Không nhận được authenticatorId từ Authsignal.");
    }

    await supabaseAdmin.from("user_mfa_methods").insert({
      user_id: userId,
      type: "magic_link",
      authsignal_user_id: authsignalUserId,
      authenticator_id: authenticatorId,
      label: maskEmail(email),
      enrolled: false,
    });

    return { ok: true, maskedEmail: maskEmail(email) };
  });

export const checkMagicLinkEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, authsignal_user_id, authenticator_id, enrolled")
      .eq("user_id", userId)
      .eq("type", "magic_link")
      .eq("enrolled", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row?.authenticator_id) {
      return { verified: false, pending: false };
    }

    // List all authenticators and find the one we're waiting on.
    const list = await authsignalFetch(
      `/users/${encodeURIComponent(row.authsignal_user_id)}/authenticators`,
      { method: "GET" },
    );
    const items: any[] = Array.isArray(list) ? list : (list?.authenticators ?? []);
    const target = items.find(
      (a) => (a.userAuthenticatorId || a.authenticatorId) === row.authenticator_id,
    );
    const isVerified = !!(target?.verifiedAt || target?.isVerified);
    if (!isVerified) {
      return { verified: false, pending: true };
    }

    const now = new Date().toISOString();
    const { data: anyEnrolled } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id")
      .eq("user_id", userId)
      .eq("enrolled", true)
      .limit(1);
    const shouldBeDefault = !anyEnrolled || anyEnrolled.length === 0;
    await supabaseAdmin
      .from("user_mfa_methods")
      .update({
        enrolled: true,
        enrolled_at: now,
        is_default: shouldBeDefault,
      })
      .eq("id", row.id);

    return { verified: true, pending: false };
  });

/* -------------------- Passkey (WebAuthn via AuthSignal browser SDK) -------------------- */

export const startPasskeyEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();
    const email = profile?.email ?? "user@marketwatch.vn";
    const displayName = profile?.full_name ?? email;

    const { data: anyMethod } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("authsignal_user_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const { data: legacy } = await supabaseAdmin
      .from("user_mfa")
      .select("authsignal_user_id")
      .eq("user_id", userId)
      .maybeSingle();
    const authsignalUserId =
      anyMethod?.authsignal_user_id ?? legacy?.authsignal_user_id ?? userId;

    // Track an action to get a session token the browser SDK can use.
    const trackResp = await authsignalFetch(
      `/users/${encodeURIComponent(authsignalUserId)}/actions/enrollPasskey`,
      {
        method: "POST",
        body: JSON.stringify({
          attributes: {
            email,
            displayName,
          },
        }),
      },
    );
    const token: string | undefined = trackResp?.token;
    if (!token) {
      throw new Error("Không lấy được token từ Authsignal.");
    }
    return {
      token,
      username: email,
      displayName,
      authsignalUserId,
      tenantId: process.env.AUTHSIGNAL_TENANT_ID ?? "",
      region: (process.env.AUTHSIGNAL_REGION || "us").toLowerCase().trim(),
    };
  });

const ConfirmPasskeySchema = z.object({
  token: z.string().min(10),
});

export const confirmPasskeyEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ConfirmPasskeySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: anyMethod } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("authsignal_user_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const { data: legacy } = await supabaseAdmin
      .from("user_mfa")
      .select("authsignal_user_id")
      .eq("user_id", userId)
      .maybeSingle();
    const authsignalUserId =
      anyMethod?.authsignal_user_id ?? legacy?.authsignal_user_id ?? userId;

    const validateResp = await authsignalFetch(`/validate-challenge`, {
      method: "POST",
      body: JSON.stringify({
        token: data.token,
        userId: authsignalUserId,
      }),
    });

    const isValid = validateResp?.isValid ?? false;
    const state: string | undefined = validateResp?.state;
    if (!isValid || (state && state !== "CHALLENGE_SUCCEEDED")) {
      throw new Error("Xác minh passkey thất bại.");
    }

    // Find the freshly-created passkey authenticator to record its ID + label.
    const list = await authsignalFetch(
      `/users/${encodeURIComponent(authsignalUserId)}/authenticators`,
      { method: "GET" },
    );
    const items: any[] = Array.isArray(list) ? list : (list?.authenticators ?? []);
    const passkeys = items.filter(
      (a) =>
        (a.verificationMethod || a.type || "").toString().toUpperCase() === "PASSKEY",
    );
    // Pick the most recently verified one
    passkeys.sort((a, b) => {
      const ta = new Date(a.verifiedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.verifiedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
    const latest = passkeys[0];
    const authenticatorId: string | undefined =
      latest?.userAuthenticatorId || latest?.authenticatorId;
    const label: string =
      latest?.aaguidMapping?.name ||
      latest?.deviceName ||
      latest?.webauthnCredential?.aaguidMapping?.name ||
      "Passkey";

    if (!authenticatorId) {
      throw new Error("Không tìm thấy passkey vừa tạo trên Authsignal.");
    }

    // Avoid duplicates
    await supabaseAdmin
      .from("user_mfa_methods")
      .delete()
      .eq("user_id", userId)
      .eq("type", "passkey")
      .eq("authenticator_id", authenticatorId);

    const now = new Date().toISOString();
    const { data: anyEnrolled } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id")
      .eq("user_id", userId)
      .eq("enrolled", true)
      .limit(1);
    const shouldBeDefault = !anyEnrolled || anyEnrolled.length === 0;

    await supabaseAdmin.from("user_mfa_methods").insert({
      user_id: userId,
      type: "passkey",
      authsignal_user_id: authsignalUserId,
      authenticator_id: authenticatorId,
      label,
      enrolled: true,
      enrolled_at: now,
      is_default: shouldBeDefault,
    });

    return { ok: true, label };
  });

/* -------------------- Step-up: list / start / verify -------------------- */

export interface EnrolledMethod {
  id: string;
  type: MfaMethodType;
  label: string | null;
  isDefault: boolean;
}

export const listEnrolledMfaMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ methods: EnrolledMethod[]; passkeyTenantId: string; region: string }> => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, type, label, is_default")
      .eq("user_id", userId)
      .eq("enrolled", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    return {
      methods: (data ?? []).map((r) => ({
        id: r.id,
        type: r.type as MfaMethodType,
        label: r.label,
        isDefault: r.is_default,
      })),
      passkeyTenantId: process.env.AUTHSIGNAL_TENANT_ID ?? "",
      region: (process.env.AUTHSIGNAL_REGION || "us").toLowerCase().trim(),
    };
  });

const StartStepUpSchema = z.object({
  methodId: z.string().uuid(),
});

/**
 * For email_otp & magic_link: sends a fresh challenge (OTP / link) to the
 * authenticator. For TOTP / passkey: no-op (client handles UI directly).
 * For passkey: also returns a fresh AuthSignal action token for the browser SDK.
 */
export const startStepUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => StartStepUpSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: row } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, type, authsignal_user_id, authenticator_id, label, enrolled")
      .eq("user_id", userId)
      .eq("id", data.methodId)
      .maybeSingle();
    if (!row?.enrolled) throw new Error("Phương thức không khả dụng.");

    if (row.type === "email_otp" || row.type === "magic_link") {
      // Trigger AuthSignal to re-send the challenge to this authenticator.
      // Per docs: POST /users/{userId}/authenticators/{authId}/challenge.
      try {
        await authsignalFetch(
          `/users/${encodeURIComponent(row.authsignal_user_id)}/authenticators/${encodeURIComponent(row.authenticator_id!)}/challenge`,
          { method: "POST", body: JSON.stringify({}) },
        );
      } catch (e: any) {
        throw new Error(e?.message || "Không gửi được mã xác minh.");
      }
      return { ok: true, type: row.type, label: row.label };
    }

    if (row.type === "passkey") {
      // Track a step-up action to get a session token the browser SDK uses
      // for `authsignal.passkey.signIn`.
      const trackResp = await authsignalFetch(
        `/users/${encodeURIComponent(row.authsignal_user_id)}/actions/stepUp`,
        { method: "POST", body: JSON.stringify({}) },
      );
      return {
        ok: true,
        type: row.type,
        token: trackResp?.token as string | undefined,
        tenantId: process.env.AUTHSIGNAL_TENANT_ID ?? "",
        region: (process.env.AUTHSIGNAL_REGION || "us").toLowerCase().trim(),
      };
    }

    // TOTP — nothing to do server-side.
    void supabase;
    return { ok: true, type: row.type, label: row.label };
  });

const VerifyStepUpSchema = z.object({
  methodId: z.string().uuid(),
  code: z.string().trim().min(1).max(20).optional(),
  token: z.string().min(10).optional(),
});

/**
 * Verifies a step-up challenge and returns a short-lived HMAC step-up token
 * the client can attach to sensitive actions (change password, change email).
 */
export const verifyStepUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VerifyStepUpSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; stepUpToken: string }> => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("user_mfa_methods")
      .select("id, type, authsignal_user_id, authenticator_id, enrolled")
      .eq("user_id", userId)
      .eq("id", data.methodId)
      .maybeSingle();
    if (!row?.enrolled) throw new Error("Phương thức không khả dụng.");

    if (row.type === "totp" || row.type === "email_otp") {
      const code = (data.code ?? "").trim();
      if (!/^\d{6}$/.test(code)) throw new Error("Mã phải là 6 chữ số.");
      const verifyResp = await authsignalFetch(
        `/users/${encodeURIComponent(row.authsignal_user_id)}/authenticators/verify`,
        {
          method: "POST",
          body: JSON.stringify({
            verificationCode: code,
            authenticatorId: row.authenticator_id,
          }),
        },
      );
      const ok = verifyResp?.isVerified ?? verifyResp?.verified ?? false;
      if (!ok) throw new Error("Mã không đúng hoặc đã hết hạn.");
      return { ok: true, stepUpToken: await issueStepUpToken(userId, row.type) };
    }

    if (row.type === "magic_link") {
      // Caller polls after triggering startStepUp. We check the authenticator's
      // verifiedAt has updated to within the last 10 minutes.
      const list = await authsignalFetch(
        `/users/${encodeURIComponent(row.authsignal_user_id)}/authenticators`,
        { method: "GET" },
      );
      const items: any[] = Array.isArray(list) ? list : (list?.authenticators ?? []);
      const target = items.find(
        (a) => (a.userAuthenticatorId || a.authenticatorId) === row.authenticator_id,
      );
      const verifiedAt = target?.verifiedAt ? new Date(target.verifiedAt).getTime() : 0;
      const fresh = verifiedAt && Date.now() - verifiedAt < 10 * 60 * 1000;
      if (!fresh) throw new Error("Chưa thấy bạn bấm link. Hãy kiểm tra email.");
      return { ok: true, stepUpToken: await issueStepUpToken(userId, row.type) };
    }

    if (row.type === "passkey") {
      if (!data.token) throw new Error("Thiếu token passkey.");
      const validateResp = await authsignalFetch(`/validate-challenge`, {
        method: "POST",
        body: JSON.stringify({
          token: data.token,
          userId: row.authsignal_user_id,
        }),
      });
      const isValid = validateResp?.isValid ?? false;
      const state: string | undefined = validateResp?.state;
      if (!isValid || (state && state !== "CHALLENGE_SUCCEEDED")) {
        throw new Error("Xác minh passkey thất bại.");
      }
      return { ok: true, stepUpToken: await issueStepUpToken(userId, row.type) };
    }

    throw new Error("Phương thức chưa hỗ trợ.");
  });
/* -------------------- Recovery codes -------------------- */

const RegenerateSchema = z.object({
  stepUpToken: z.string().min(10).optional(),
});

export const getRecoveryCodesStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: legacy } = await supabaseAdmin
      .from("user_mfa")
      .select("backup_codes, enrolled")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      hasTotp: !!legacy?.enrolled,
      remaining: (legacy?.backup_codes ?? []).length,
    };
  });

/**
 * Regenerates 8 fresh backup codes. Invalidates the old set.
 * Requires step-up MFA verification if the user has any MFA method.
 */
export const regenerateBackupCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RegenerateSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ backupCodes: string[] }> => {
    const { userId } = context;
    await requireStepUp(userId, data.stepUpToken ?? null);

    const { data: legacy } = await supabaseAdmin
      .from("user_mfa")
      .select("enrolled")
      .eq("user_id", userId)
      .maybeSingle();
    if (!legacy?.enrolled) {
      throw new Error("Hãy bật Authenticator app trước khi tạo mã dự phòng.");
    }

    const codes = generateBackupCodes();
    const hashed = await Promise.all(codes.map(hashCode));
    await supabaseAdmin
      .from("user_mfa")
      .update({ backup_codes: hashed })
      .eq("user_id", userId);
    return { backupCodes: codes };
  });
