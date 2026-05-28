const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "MarketWatch <noreply@marketwatch.vn>";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: string[];
  /** Kept for backwards compatibility with the previous Postmark integration; unused by Resend. */
  stream?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id?: string; message?: string }> {
  const token = process.env.RESEND_API_KEY;
  if (!token) throw new Error("RESEND_API_KEY is not configured");

  const body: Record<string, unknown> = {
    from: params.from ?? DEFAULT_FROM,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text ?? stripHtml(params.html),
  };
  if (params.replyTo) body.reply_to = params.replyTo;
  if (params.tags && params.tags.length > 0) {
    body.tags = params.tags.map((name) => ({ name: sanitizeTag(name), value: "1" }));
  }

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Resend send failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data as { id?: string; message?: string };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Resend tag names must match /^[a-zA-Z0-9_-]+$/
function sanitizeTag(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 256) || "tag";
}