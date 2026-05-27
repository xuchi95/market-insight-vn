const GATEWAY_URL = "https://connector-gateway.lovable.dev/mailgun";
const MAILGUN_DOMAIN = "marketwatch.vn";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: string[];
}

export async function sendEmail(params: SendEmailParams): Promise<{ id?: string; message?: string }> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
  if (!MAILGUN_API_KEY) throw new Error("MAILGUN_API_KEY is not configured");

  const body = new URLSearchParams({
    from: params.from ?? "MarketWatch <noreply@marketwatch.vn>",
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text ?? stripHtml(params.html),
  });
  if (params.replyTo) body.append("h:Reply-To", params.replyTo);
  for (const tag of params.tags ?? []) body.append("o:tag", tag);

  const res = await fetch(`${GATEWAY_URL}/${MAILGUN_DOMAIN}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": MAILGUN_API_KEY,
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Mailgun send failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data as { id?: string; message?: string };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}