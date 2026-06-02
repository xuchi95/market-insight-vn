// Email sending via Postmark API. The exported `sendEmail` signature is kept
// stable so existing call sites (contact form, newsletter, digest, alerts,
// MFA/Authsignal) continue to work unchanged.
const POSTMARK_URL = "https://api.postmarkapp.com/email";
const DEFAULT_FROM = "MarketWatch <noreply@marketwatch.vn>";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: string[];
  /** Postmark message stream id. Defaults to "outbound" (transactional). */
  stream?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id?: string; message?: string }> {
  const token = process.env.POSTMARK_API_KEY;
  if (!token) throw new Error("POSTMARK_API_KEY is not configured");

  const body: Record<string, unknown> = {
    From: params.from ?? DEFAULT_FROM,
    To: params.to,
    Subject: params.subject,
    HtmlBody: params.html,
    TextBody: params.text ?? stripHtml(params.html),
    MessageStream: params.stream ?? "outbound",
  };
  if (params.replyTo) body.ReplyTo = params.replyTo;
  // Postmark accepts a single Tag string.
  if (params.tags && params.tags.length > 0) {
    body.Tag = sanitizeTag(params.tags[0]);
  }

  const res = await fetch(POSTMARK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Postmark send failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return { id: data?.MessageID, message: data?.Message };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeTag(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "tag";
}