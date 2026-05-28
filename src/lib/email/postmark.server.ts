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
  stream?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ MessageID?: string; ErrorCode?: number; Message?: string }> {
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
  if (params.tags && params.tags.length > 0) body.Tag = params.tags[0];

  const res = await fetch(POSTMARK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Postmark send failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data as { MessageID?: string; ErrorCode?: number; Message?: string };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}