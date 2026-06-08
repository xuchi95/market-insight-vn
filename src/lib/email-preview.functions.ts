import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend.server";
import {
  welcomeEmail,
  newsletterConfirmEmail,
  contactConfirmEmail,
  contactForwardEmail,
  priceAlertEmail,
  goldDigestEmail,
  cryptoDigestEmail,
  fxDigestEmail,
} from "@/lib/email/templates.server";
import { buildDigestEmail, fetchDigestData, type DigestTopic } from "@/lib/email/digest.server";
import {
  fetchDailyGoldRows,
  fetchDailyCryptoRows,
  fetchDailyFxRows,
  sampleGoldRows,
  sampleCryptoRows,
  sampleFxRows,
  todayLabel,
} from "@/lib/email/daily-digest.server";

export const EMAIL_TEMPLATES = [
  { id: "welcome", label: "Chào mừng đăng ký" },
  { id: "newsletter-confirm", label: "Xác nhận đăng ký bản tin" },
  { id: "contact-confirm", label: "Xác nhận liên hệ (gửi khách)" },
  { id: "contact-forward", label: "Chuyển tiếp liên hệ (nội bộ)" },
  { id: "price-alert", label: "Cảnh báo giá" },
  { id: "daily-gold-digest", label: "Nhật báo giá vàng (mẫu)" },
  { id: "daily-gold-digest-live", label: "Nhật báo giá vàng — dữ liệu thực" },
  { id: "daily-crypto-digest", label: "Nhật báo Crypto (mẫu)" },
  { id: "daily-crypto-digest-live", label: "Nhật báo Crypto — dữ liệu thực" },
  { id: "daily-fx-digest", label: "Nhật báo tỷ giá (mẫu)" },
  { id: "daily-fx-digest-live", label: "Nhật báo tỷ giá — dữ liệu thực" },
  { id: "weekly-digest", label: "Bản tin tuần (vàng + BTC + USD)" },
  { id: "weekly-digest-live", label: "Bản tin tuần — dùng dữ liệu thực" },
] as const;

export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[number]["id"];

export const SAMPLE_DATA: Record<EmailTemplateId, Record<string, unknown>> = {
  welcome: { name: "Minh Anh" },
  "newsletter-confirm": { email: "ban@vidu.vn" },
  "contact-confirm": {
    name: "Minh Anh",
    message: "Mình muốn hỏi về cách thiết lập cảnh báo giá vàng theo ngưỡng riêng.",
  },
  "contact-forward": {
    name: "Minh Anh",
    email: "ban@vidu.vn",
    subject: "Hỏi về cảnh báo giá",
    message: "Mình muốn hỏi về cách thiết lập cảnh báo giá vàng theo ngưỡng riêng.",
    ip: "203.0.113.42",
  },
  "price-alert": {
    symbol: "BTC",
    assetType: "crypto",
    direction: "above",
    threshold: 100000,
    currentPrice: 101234.56,
  },
  "daily-gold-digest": {},
  "daily-gold-digest-live": {},
  "daily-crypto-digest": {},
  "daily-crypto-digest-live": {},
  "daily-fx-digest": {},
  "daily-fx-digest-live": {},
  "weekly-digest": {
    topics: ["gold", "btc", "usd"],
  },
  "weekly-digest-live": {
    topics: ["gold", "btc", "usd"],
  },
};

function mockDigestSeries(topic: DigestTopic) {
  const base = topic === "gold" ? 2650 : topic === "btc" ? 100000 : 25400;
  const series30 = Array.from({ length: 30 }, (_, i) =>
    base * (1 + Math.sin((i / 29) * Math.PI * 2) * 0.05 + (i / 29) * 0.02),
  );
  const series = series30.slice(-8);
  const current = series[series.length - 1];
  const previous = series[0];
  const first30 = series30[0];
  const changeAbs = current - previous;
  return {
    topic,
    label: topic === "gold" ? "Vàng (XAU/USD)" : topic === "btc" ? "Bitcoin (BTC)" : "Tỷ giá USD/VND",
    unit: topic === "usd" ? "VND" : "USD",
    current,
    previous,
    changeAbs,
    changePct: (changeAbs / previous) * 100,
    series,
    series30,
    high7: Math.max(...series),
    low7: Math.min(...series),
    high30: Math.max(...series30),
    low30: Math.min(...series30),
    changePct30: first30 ? ((current - first30) / first30) * 100 : 0,
  };
}

const PreviewSchema = z.object({
  template: z.string().min(1),
  dataJson: z.string().max(8000).optional(),
});

async function renderTemplate(template: string, data: Record<string, any>): Promise<{ subject: string; html: string }> {
  const VALID_TOPICS: DigestTopic[] = ["gold", "btc", "usd"];
  const unsubUrl = "https://marketwatch.vn/huy-ban-tin?token=preview";
  const dateLabel = todayLabel();
  const emptyLive = (label: string) => ({
    subject: `(Không có dữ liệu thực cho ${label} — thử lại sau)`,
    html: `<p style='font-family:sans-serif;padding:24px;color:#666;'>Không lấy được dữ liệu thực cho ${label}. Kiểm tra <code>FMP_API_KEY</code> / <code>COINGECKO_API_KEY</code>, hoặc chọn template (mẫu) để xem bố cục.</p>`,
  });
  switch (template) {
    case "welcome":
      return welcomeEmail({ name: data.name ?? null });
    case "newsletter-confirm":
      return newsletterConfirmEmail({ email: data.email ?? "ban@vidu.vn" });
    case "contact-confirm":
      return contactConfirmEmail({
        name: data.name ?? "Khách",
        message: data.message ?? "",
      });
    case "contact-forward":
      return contactForwardEmail({
        name: data.name ?? "Khách",
        email: data.email ?? "ban@vidu.vn",
        subject: data.subject ?? null,
        message: data.message ?? "",
        ip: data.ip ?? null,
      });
    case "price-alert":
      return priceAlertEmail({
        symbol: String(data.symbol ?? "BTC"),
        assetType: (data.assetType === "gold" ? "gold" : "crypto") as "gold" | "crypto",
        direction: (data.direction === "below" ? "below" : "above") as "above" | "below",
        threshold: Number(data.threshold ?? 100000),
        currentPrice: Number(data.currentPrice ?? 100000),
      });
    case "daily-gold-digest":
      return goldDigestEmail({ dateLabel, rows: sampleGoldRows(), unsubUrl });
    case "daily-gold-digest-live": {
      const rows = await fetchDailyGoldRows();
      if (!rows.length) return emptyLive("giá vàng");
      return goldDigestEmail({ dateLabel, rows, unsubUrl });
    }
    case "daily-crypto-digest":
      return cryptoDigestEmail({ dateLabel, rows: sampleCryptoRows(), unsubUrl });
    case "daily-crypto-digest-live": {
      const rows = await fetchDailyCryptoRows();
      if (!rows.length) return emptyLive("crypto");
      return cryptoDigestEmail({ dateLabel, rows, unsubUrl });
    }
    case "daily-fx-digest":
      return fxDigestEmail({ dateLabel, rows: sampleFxRows(), unsubUrl });
    case "daily-fx-digest-live": {
      const rows = await fetchDailyFxRows();
      if (!rows.length) return emptyLive("tỷ giá");
      return fxDigestEmail({ dateLabel, rows, unsubUrl });
    }
    case "weekly-digest": {
      const topics = (Array.isArray(data.topics) ? data.topics : VALID_TOPICS)
        .filter((t: any): t is DigestTopic => (VALID_TOPICS as string[]).includes(t));
      const series = (topics.length ? topics : VALID_TOPICS).map(mockDigestSeries);
      return buildDigestEmail({ series, unsubUrl });
    }
    case "weekly-digest-live": {
      const topics = (Array.isArray(data.topics) ? data.topics : VALID_TOPICS)
        .filter((t: any): t is DigestTopic => (VALID_TOPICS as string[]).includes(t));
      const series = await fetchDigestData(topics.length ? topics : VALID_TOPICS);
      if (series.length === 0) {
        return {
          subject: "(Không có dữ liệu thực — thử lại sau)",
          html: "<p style='font-family:sans-serif;padding:24px;color:#666;'>Không lấy được dữ liệu thực từ nhà cung cấp. Hãy thử lại sau hoặc dùng template 'weekly-digest' với dữ liệu mẫu.</p>",
        };
      }
      return buildDigestEmail({ series, unsubUrl });
    }
    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

export const previewEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PreviewSchema.parse(input))
  .handler(async ({ data }) => {
    const parsed = data.dataJson ? (JSON.parse(data.dataJson) as Record<string, any>) : {};
    return renderTemplate(data.template, parsed);
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      template: z.string().min(1),
      dataJson: z.string().max(8000).optional(),
      to: z.string().trim().toLowerCase().email().max(254).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    let to = data.to;
    if (!to) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      to = profile?.email ?? undefined;
    }
    if (!to) throw new Error("Không xác định được email người nhận");

    const parsed = data.dataJson ? (JSON.parse(data.dataJson) as Record<string, any>) : {};
    const { subject, html } = await renderTemplate(data.template, parsed);
    const result = await sendEmail({
      to,
      subject: `[TEST] ${subject}`,
      html,
      tags: ["email-preview-test"],
    });
    return { ok: true, to, subject, messageId: result.id ?? null };
  });
