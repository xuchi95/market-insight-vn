import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

// Authsignal "Webhook" SMS provider:
// Authsignal POSTs JSON to this endpoint every time it needs to send an SMS
// (enrollment code, login challenge, etc.). We verify the request with the
// tenant secret (AUTHSIGNAL_API_SECRET), then forward the SMS via Twilio's
// REST API directly — no Lovable AI Gateway, no Cloud credit.
//
// Configure in Authsignal dashboard:
//   Authenticators → SMS → Provider = Webhook
//   Webhook URL  = https://marketwatch.vn/api/public/authsignal-sms
//                  (or https://project--52e41981-97fc-41b5-ab3a-9e7715246666.lovable.app/api/public/authsignal-sms)
//   Tenant secret = AUTHSIGNAL_API_SECRET (already set as a project secret)
//
// Required secrets for Speedsms.vn (set via Project Settings → Secrets):
//   SPEEDSMS_ACCESS_TOKEN  (Access token lấy trong trang quản trị Speedsms)
//   SPEEDSMS_SENDER        (Brandname đã đăng ký, vd "MARKETWATCH")
//   SPEEDSMS_SMS_TYPE      (tuỳ chọn — mặc định "3" = Brandname OTP; "2" = Brandname CSKH)

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  // Authsignal sends `x-signature: t=<unix>,v1=<hex>` (also accepts a bare hex hash for
  // older tenants). We accept either.
  const parts = header.split(",").map((p) => p.trim());
  let timestamp: string | null = null;
  let signatures: string[] = [];
  for (const p of parts) {
    if (p.startsWith("t=")) timestamp = p.slice(2);
    else if (p.startsWith("v1=")) signatures.push(p.slice(3));
    else if (/^[a-f0-9]{64}$/i.test(p)) signatures.push(p);
  }
  if (signatures.length === 0) return false;

  const candidates = new Set<string>();
  // Stripe-style payload: `${timestamp}.${body}`
  if (timestamp) {
    candidates.add(createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"));
  }
  // Plain body
  candidates.add(createHmac("sha256", secret).update(rawBody).digest("hex"));

  for (const sig of signatures) {
    for (const expected of candidates) {
      try {
        const a = Buffer.from(sig, "hex");
        const b = Buffer.from(expected, "hex");
        if (a.length === b.length && timingSafeEqual(a, b)) return true;
      } catch {
        /* ignore */
      }
    }
  }
  return false;
}

// Chuẩn hoá số điện thoại sang định dạng eSMS yêu cầu (84xxxxxxxxx, không dấu +).
function normalizePhoneVN(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("84")) return digits;
  if (digits.startsWith("0")) return "84" + digits.slice(1);
  return digits;
}

async function sendSmsViaSpeedsms(to: string, body: string): Promise<void> {
  const accessToken = process.env.SPEEDSMS_ACCESS_TOKEN;
  const sender = process.env.SPEEDSMS_SENDER;
  // 2 = Brandname CSKH, 3 = Brandname OTP (Speedsms quy ước)
  const smsType = Number(process.env.SPEEDSMS_SMS_TYPE || "3");
  if (!accessToken || !sender) {
    throw new Error("Speedsms chưa được cấu hình (thiếu SPEEDSMS_ACCESS_TOKEN / SPEEDSMS_SENDER).");
  }

  const phone = normalizePhoneVN(to);
  const payload = {
    to: [phone],
    content: body,
    sms_type: smsType,
    sender,
  };

  // Speedsms dùng Basic auth: base64(accessToken + ":x")
  const auth = Buffer.from(`${accessToken}:x`).toString("base64");
  const res = await fetch("https://api.speedsms.vn/index.php/sms/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Speedsms HTTP lỗi [${res.status}]: ${text}`);
  }
  const json: any = await res.json().catch(() => null);
  // Speedsms trả về { status: "success", ... } khi thành công.
  if (!json || json.status !== "success") {
    throw new Error(`Speedsms từ chối: ${json?.message ?? JSON.stringify(json)}`);
  }
}

export const Route = createFileRoute("/api/public/authsignal-sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AUTHSIGNAL_API_SECRET;
        if (!secret) {
          console.error("authsignal-sms: AUTHSIGNAL_API_SECRET chưa cấu hình");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const sigHeader =
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

        // Authsignal sends a few shapes depending on version; normalize.
        const to: string | undefined =
          payload?.to ||
          payload?.phoneNumber ||
          payload?.phone_number ||
          payload?.recipient ||
          payload?.data?.to ||
          payload?.data?.phoneNumber;
        const text: string | undefined =
          payload?.text ||
          payload?.body ||
          payload?.message ||
          payload?.smsText ||
          payload?.data?.text ||
          payload?.data?.body;

        if (!to || !text) {
          console.error("authsignal-sms: payload thiếu to/text", payload);
          return new Response("Missing to/text", { status: 400 });
        }

        try {
          await sendSmsViaSpeedsms(to, text);
        } catch (e: any) {
          console.error("authsignal-sms: gửi SMS thất bại", e?.message ?? e);
          return Response.json({ ok: false, error: e?.message ?? "send_failed" }, { status: 502 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});