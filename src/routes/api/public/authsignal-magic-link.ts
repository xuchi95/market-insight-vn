import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sendEmail } from "@/lib/email/resend.server";
import { magicLinkEmail } from "@/lib/email/templates.server";

// Authsignal "Webhook" Email Magic Link provider.
// Authsignal POSTs JSON to this endpoint whenever it needs to deliver a
// magic-link email (sign-in, enrollment, step-up). We verify the request
// with the tenant secret (AUTHSIGNAL_API_SECRET), render the MarketWatch
// magic-link template, and send via Resend.
//
// Cấu hình trên Authsignal Portal:
//   Authenticators → Email Magic Link → Provider = Webhook
//   Webhook URL = https://marketwatch.vn/api/public/authsignal-magic-link
//   Tenant secret = AUTHSIGNAL_API_SECRET (đã có sẵn trong project secrets)

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
      } catch {
        /* ignore */
      }
    }
  }
  return false;
}

export const Route = createFileRoute("/api/public/authsignal-magic-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AUTHSIGNAL_API_SECRET;
        if (!secret) {
          console.error("authsignal-magic-link: AUTHSIGNAL_API_SECRET chưa cấu hình");
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

        const to: string | undefined =
          payload?.data?.to ||
          payload?.to ||
          payload?.email ||
          payload?.data?.email;
        const url: string | undefined =
          payload?.data?.url ||
          payload?.url ||
          payload?.magicLink ||
          payload?.data?.magicLink;
        const type: string | undefined = payload?.type;

        if (!to || !url) {
          console.error("authsignal-magic-link: payload thiếu to/url", payload);
          return new Response("Missing to/url", { status: 400 });
        }

        // Chỉ xử lý sự kiện email.created (magic link). Các sự kiện khác trả 200
        // để Authsignal không retry vô ích.
        if (type && type !== "email.created") {
          return Response.json({ ok: true, skipped: type });
        }

        try {
          const { subject, html } = magicLinkEmail({ actionLink: url });
          await sendEmail({
            to,
            subject,
            html,
            tags: ["authsignal", "magic-link"],
          });
        } catch (e: any) {
          console.error("authsignal-magic-link: gửi email thất bại", e?.message ?? e);
          return Response.json(
            { ok: false, error: e?.message ?? "send_failed" },
            { status: 502 },
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});