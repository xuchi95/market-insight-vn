import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sendEmail } from "@/lib/email/resend.server";
import { loginOtpEmail, magicLinkEmail } from "@/lib/email/templates.server";

// Authsignal "Webhook" Email provider (Email OTP + Magic Link).
// Authsignal POSTs JSON ở đây mỗi khi cần gửi email xác thực
// (mã OTP 6 số hoặc magic link). Verify chữ ký HMAC-SHA256 bằng
// AUTHSIGNAL_API_SECRET rồi gửi email qua Resend.
//
// Cấu hình trên Authsignal Portal:
//   Authenticators → Email OTP → Provider = Webhook
//   Webhook URL  = https://marketwatch.vn/api/public/authsignal-email
//   Tenant secret = AUTHSIGNAL_API_SECRET (đã có trong project)

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim());
  let timestamp: string | null = null;
  const signatures: string[] = [];
  for (const p of parts) {
    if (p.startsWith("t=")) timestamp = p.slice(2);
    else if (p.startsWith("v1=")) signatures.push(p.slice(3));
    else if (p.startsWith("v2=")) signatures.push(p.slice(3));
    else if (/^[a-f0-9]{64}$/i.test(p)) signatures.push(p);
  }
  if (signatures.length === 0) return false;
  const candidates = new Set<string>();
  if (timestamp) {
    candidates.add(createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"));
  }
  candidates.add(createHmac("sha256", secret).update(rawBody).digest("hex"));
  for (const sig of signatures) {
    for (const expected of candidates) {
      try {
        const a = Buffer.from(sig, "hex");
        const b = Buffer.from(expected, "hex");
        if (a.length === b.length && timingSafeEqual(a, b)) return true;
      } catch { /* ignore */ }
    }
  }
  return false;
}

export const Route = createFileRoute("/api/public/authsignal-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AUTHSIGNAL_API_SECRET;
        if (!secret) {
          console.error("authsignal-email: AUTHSIGNAL_API_SECRET chưa cấu hình");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const sigHeader =
          request.headers.get("x-signature-v2") ||
          request.headers.get("x-signature") ||
          request.headers.get("x-authsignal-signature") ||
          request.headers.get("authsignal-signature");

        if (!verifySignature(rawBody, sigHeader, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any = null;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const data = payload?.data ?? payload ?? {};
        const to: string | undefined = data.to || data.email || payload?.to || payload?.email;
        const code: string | undefined = data.code || data.otp || data.verificationCode || payload?.code;
        const url: string | undefined = data.url || data.magicLink || payload?.url;

        if (!to || (!code && !url)) {
          console.error("authsignal-email: payload thiếu to/code|url", payload);
          return new Response("Missing to/code|url", { status: 400 });
        }

        const rendered = code
          ? loginOtpEmail({ code })
          : magicLinkEmail({ actionLink: url! });

        try {
          await sendEmail({
            to,
            subject: rendered.subject,
            html: rendered.html,
            tags: ["authsignal", code ? "email-otp" : "magic-link"],
          });
        } catch (e: any) {
          console.error("authsignal-email: gửi email thất bại", e?.message ?? e);
          return Response.json({ ok: false, error: e?.message ?? "send_failed" }, { status: 502 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});