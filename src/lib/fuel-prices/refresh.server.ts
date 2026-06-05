import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RowSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(40),
  zone1: z.number().int().min(0).max(1_000_000),
  zone2: z.number().int().min(0).max(1_000_000),
  highlight: z.boolean().optional(),
});

const AiExtractSchema = z.object({
  effective_from: z.string().min(1),
  rows: z.array(RowSchema).min(1),
});

export type ExtractedSnapshot = z.infer<typeof AiExtractSchema>;

/**
 * Tìm thông cáo điều chỉnh giá mới nhất trên petrolimex.com.vn và
 * lấy URL ảnh JPG bảng giá đính kèm. Dùng Firecrawl vì homepage được
 * render dynamic.
 */
export async function findLatestPetrolimexRelease(): Promise<{
  pageUrl: string;
  imageUrl: string;
  markdown: string;
}> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY chưa được cấu hình");

  const homeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://www.petrolimex.com.vn/",
      formats: ["links"],
      onlyMainContent: false,
    }),
  });
  if (!homeRes.ok) throw new Error(`Không tải được homepage Petrolimex (${homeRes.status})`);
  const homeJson = (await homeRes.json()) as { data?: { links?: string[] }; links?: string[] };
  const links: string[] = homeJson.data?.links ?? homeJson.links ?? [];
  const releaseLinks = links.filter((u) =>
    /petrolimex-dieu-chinh-gia-xang-dau-tu-.*\.html$/i.test(u),
  );
  if (releaseLinks.length === 0) {
    throw new Error("Không tìm thấy thông cáo điều chỉnh giá mới trên trang chủ Petrolimex.");
  }
  // URL dạng: ...ngay-DD-M-YYYY.html (vd ngay-04-6-2026 hoặc ngay-28-5-2026).
  // Sort theo ngày thực, KHÔNG sort theo chuỗi (chuỗi "28-5" > "04-6" alphabetically → chọn sai).
  const dated = releaseLinks
    .map((u) => {
      const m = u.match(/ngay-(\d{1,2})-(\d{1,2})-(\d{4})\.html$/i);
      if (!m) return { u, t: 0 };
      const [, d, mo, y] = m;
      return { u, t: Date.UTC(Number(y), Number(mo) - 1, Number(d)) };
    })
    .sort((a, b) => b.t - a.t);
  const pageUrl = dated[0].u;

  const pageRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url: pageUrl,
      formats: ["markdown", "links"],
      onlyMainContent: true,
    }),
  });
  if (!pageRes.ok) throw new Error(`Không tải được thông cáo Petrolimex (${pageRes.status})`);
  const pageJson = (await pageRes.json()) as {
    data?: { markdown?: string; links?: string[] };
    markdown?: string;
    links?: string[];
  };
  const markdown = pageJson.data?.markdown ?? pageJson.markdown ?? "";
  const pageLinks = pageJson.data?.links ?? pageJson.links ?? [];
  const imgFromMd = markdown.match(/https:\/\/files\.petrolimex\.com\.vn\/[^\s)]+\.jpg/i)?.[0];
  const imgFromLinks = pageLinks.find((u) =>
    /https:\/\/files\.petrolimex\.com\.vn\/.+\.jpg$/i.test(u),
  );
  const imageUrl = imgFromMd ?? imgFromLinks;
  if (!imageUrl) throw new Error("Thông cáo Petrolimex không có ảnh bảng giá đính kèm.");
  return { pageUrl, imageUrl, markdown };
}

/** Gemini 2.5 Pro vision OCR + trích xuất bảng giá. */
export async function aiExtract(
  imageUrl: string,
  contextMarkdown: string,
): Promise<ExtractedSnapshot> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY chưa được cấu hình");

  const system =
    "Bạn là trợ lý OCR + trích xuất bảng giá bán lẻ xăng dầu chính thức của Petrolimex. " +
    "Chỉ trả về JSON đúng schema, không kèm văn bản thừa.";
  const userText = `Đây là ảnh bảng giá xăng dầu chính thức của Petrolimex (thông cáo báo chí). Hãy OCR và trích xuất bảng giá.

Quy tắc bắt buộc:
- "effective_from": ngày & giờ hiệu lực (vd "15:00 — 28/05/2026"). Lấy từ tiêu đề thông cáo trong phần ngữ cảnh bên dưới. Nếu chỉ có ngày, dùng "15:00 — DD/MM/YYYY".
- Mỗi mặt hàng (RON 95-V, RON 95-III, E10 RON 95-III, E5 RON 92-II, DO 0,001S-V, DO 0,05S-II, Dầu hỏa 2-K, Mazút N02B…) là 1 row.
- Mỗi row: name (giữ nguyên tên trong ảnh), unit ("đồng/lít" với xăng-DO-dầu hỏa, "đồng/kg" với Mazút), zone1 (Vùng 1, số nguyên VND), zone2 (Vùng 2, số nguyên VND).
- Trong ảnh Petrolimex 2 cột giá thường là "Vùng 1" và "Vùng 2". Nếu chỉ có 1 cột, điền zone1 = zone2.
- Bỏ dấu phẩy/dấu chấm trong số (vd "25.050" → 25050).
- "highlight": true cho 3 mặt hàng phổ biến: RON 95-V, E5 RON 92-II, DO 0,05S-II.
- Phải có tối thiểu 4 rows. Nếu ảnh mờ/không đọc được, tự nhận và trả lỗi qua field rows rỗng.

Ngữ cảnh từ trang thông cáo (để xác định effective_from):
${contextMarkdown.slice(0, 4000)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fuel_snapshot",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["effective_from", "rows"],
            properties: {
              effective_from: { type: "string" },
              rows: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "unit", "zone1", "zone2", "highlight"],
                  properties: {
                    name: { type: "string" },
                    unit: { type: "string" },
                    zone1: { type: "integer" },
                    zone2: { type: "integer" },
                    highlight: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });
  if (res.status === 429) throw new Error("Lovable AI rate-limited (429). Thử lại sau.");
  if (res.status === 402) throw new Error("Đã hết credits Lovable AI.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Lovable AI ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI không trả về nội dung.");
  const parsed = JSON.parse(content);
  const result = AiExtractSchema.safeParse(parsed);
  if (!result.success) throw new Error("AI không đọc được bảng giá từ ảnh thông cáo Petrolimex.");
  return result.data;
}

/**
 * End-to-end: scrape Petrolimex → OCR → so sánh với snapshot hiện tại →
 * chỉ upsert + ghi history nếu `effective_from` MỚI khác giá trị cũ.
 * Trả về `{ updated: false }` khi không có kỳ điều chỉnh mới — an toàn
 * khi gọi nhiều lần (idempotent).
 */
export async function refreshFuelPricesFromPetrolimex(opts: {
  source: "auto" | "cron";
  userId?: string | null;
}): Promise<{
  updated: boolean;
  effective_from: string;
  previous_effective_from: string | null;
  rowCount: number;
  source_url: string;
  rows: ExtractedSnapshot["rows"];
}> {
  const { pageUrl, imageUrl, markdown } = await findLatestPetrolimexRelease();
  const extracted = await aiExtract(imageUrl, markdown);

  const { data: existing } = await supabaseAdmin
    .from("vn_fuel_prices_snapshot")
    .select("effective_from")
    .eq("id", "latest")
    .maybeSingle();
  const previous = existing?.effective_from ?? null;

  if (previous && previous.trim() === extracted.effective_from.trim()) {
    return {
      updated: false,
      effective_from: extracted.effective_from,
      previous_effective_from: previous,
      rowCount: extracted.rows.length,
      source_url: pageUrl,
      rows: extracted.rows,
    };
  }

  const { error } = await supabaseAdmin.from("vn_fuel_prices_snapshot").upsert({
    id: "latest",
    effective_from: extracted.effective_from,
    source_url: pageUrl,
    rows: extracted.rows as unknown as never,
    updated_at: new Date().toISOString(),
    updated_by: opts.userId ?? null,
  });
  if (error) throw new Error(`DB upsert lỗi: ${error.message}`);

  await supabaseAdmin.from("vn_fuel_prices_history").insert({
    effective_from: extracted.effective_from,
    source_url: pageUrl,
    rows: extracted.rows as unknown as never,
    source: opts.source,
    created_by: opts.userId ?? null,
  });

  return {
    updated: true,
    effective_from: extracted.effective_from,
    previous_effective_from: previous,
    rowCount: extracted.rows.length,
    source_url: pageUrl,
    rows: extracted.rows,
  };
}