import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// --- Authsignal REST client (called directly from server — no Lovable AI Gateway, no Cloud credit) ---

function authsignalBaseUrl(): string {
  const raw = (process.env.AUTHSIGNAL_REGION || "us").toLowerCase().trim();
  // Chấp nhận cả mã region (us, eu, au) lẫn tên hiển thị ("AP Southeast (Sydney)", "US Oregon", ...)
  // Chuẩn hoá: bỏ khoảng trắng/dấu ngoặc rồi map về subdomain hợp lệ của Authsignal.
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
  return `https://${region}.signal.authsignal.com/v1`;
}

function authsignalAuthHeader(): string {
  const tenantId = process.env.AUTHSIGNAL_TENANT_ID;
  const secret = process.env.AUTHSIGNAL_API_SECRET;
  if (!tenantId || !secret) {
    throw new Error("Authsignal chưa được cấu hình (thiếu AUTHSIGNAL_TENANT_ID hoặc AUTHSIGNAL_API_SECRET).");
  }
  // Basic auth: tenantId:secret
  const token = Buffer.from(`${tenantId}:${secret}`).toString("base64");
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

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code.toLowerCase().trim());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
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

    // Enroll a new TOTP authenticator
    const enrollResp = await authsignalFetch(
      `/users/${encodeURIComponent(authsignalUserId)}/authenticators`,
      {
        method: "POST",
        body: JSON.stringify({
          verificationMethod: "AUTHENTICATOR_APP",
          username: email,
        }),
      },
    );

    const authenticator = enrollResp?.authenticator ?? enrollResp;
    const authenticatorId: string | undefined =
      authenticator?.userAuthenticatorId || authenticator?.authenticatorId || enrollResp?.userAuthenticatorId;
    const otpauthUri: string | undefined =
      authenticator?.otpauthUri || enrollResp?.otpauthUri || authenticator?.oobChannel;
    const secret: string | undefined =
      authenticator?.secret || enrollResp?.secret;

    if (!authenticatorId || !otpauthUri) {
      throw new Error("Không nhận được dữ liệu đăng ký từ Authsignal.");
    }

    // Persist pending enrollment
    await supabaseAdmin.from("user_mfa").upsert({
      user_id: userId,
      authsignal_user_id: authsignalUserId,
      authenticator_id: authenticatorId,
      enrolled: false,
    }, { onConflict: "user_id" });

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
    return { ok: true };
  });