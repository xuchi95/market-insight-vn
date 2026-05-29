import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

// Authsignal "Webhook" Push notification provider.
// Authsignal POSTs JSON ở đây mỗi khi cần gửi push verification tới thiết bị
// của user. Verify chữ ký HMAC-SHA256 bằng AUTHSIGNAL_API_SECRET rồi forward
// payload tới hệ thống push của bạn (FCM/APNs/OneSignal/…).
//
// Cấu hình trên Authsignal Portal:
//   Authenticators → Push → Provider = Webhook
//   Webhook URL  = https://marketwatch.vn/api/public/authsignal-push
//   Tenant secret = AUTHSIGNAL_API_SECRET (đã có trong project)
//
// Hiện tại marketwatch.vn chưa tích hợp provider push thật (FCM/APNs).
// Endpoint này verify chữ ký, log payload và trả 200 để Authsignal không
// retry. Khi bạn nối FCM/APNs, thay block "TODO" bên dưới bằng lệnh gửi
// push thật.

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

export const Route = createFileRoute("/api/public/authsignal-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AUTHSIGNAL_API_SECRET;
        if (!secret) {
          console.error("authsignal-push: AUTHSIGNAL_API_SECRET chưa cấu hình");
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

        // TODO: nối tới provider push thật (FCM / APNs / OneSignal …) ở đây.
        // Payload thường có: { type, data: { userId, deviceTokens, title, body, actionCode, … } }
        console.log("authsignal-push: nhận push request", {
          type: payload?.type,
          userId: payload?.data?.userId,
          actionCode: payload?.data?.actionCode,
        });

        return Response.json({ ok: true });
      },
    },
  },
});