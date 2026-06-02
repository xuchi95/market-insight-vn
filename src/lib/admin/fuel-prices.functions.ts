import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RowSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(40),
  zone1: z.number().int().min(0).max(1_000_000),
  zone2: z.number().int().min(0).max(1_000_000),
  highlight: z.boolean().optional(),
});

const SnapshotSchema = z.object({
  effective_from: z.string().trim().min(1).max(120),
  source_url: z.string().url().max(500),
  rows: z.array(RowSchema).min(1).max(40),
});

export type FuelRowInput = z.infer<typeof RowSchema>;
export type FuelSnapshotInput = z.infer<typeof SnapshotSchema>;

/** Public read — used by homepage table. */
export const getFuelSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("vn_fuel_prices_snapshot")
    .select("effective_from, source_url, rows, updated_at")
    .eq("id", "latest")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

/** Admin save (manual edit). */
export const saveFuelSnapshot = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => SnapshotSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const { error } = await supabaseAdmin.from("vn_fuel_prices_snapshot").upsert({
      id: "latest",
      effective_from: data.effective_from,
      source_url: data.source_url,
      rows: data.rows as unknown as never,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("vn_fuel_prices_history").insert({
      effective_from: data.effective_from,
      source_url: data.source_url,
      rows: data.rows as unknown as never,
      source: "manual",
      created_by: userId,
    });
    await logAudit(userId, "fuel_prices.save", "vn_fuel_prices_snapshot", "latest", {
      rowCount: data.rows.length,
      effective_from: data.effective_from,
    });
    return { ok: true };
  });

const PETROLIMEX_URL = "https://www.petrolimex.com.vn/";

/** Tìm kiếm bài báo mới nhất về giá xăng dầu rồi ghép markdown lại. */
async function firecrawlSearchFuel(): Promise<{ markdown: string; sourceUrl: string }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY chưa được cấu hình");

  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query:
        "giá xăng dầu Petrolimex hôm nay RON 95-V E5 RON 92 Diesel Vùng 1 Vùng 2",
      limit: 5,
      lang: "vi",
      country: "vn",
      tbs: "qdr:w",
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl search ${res.status}: ${t.slice(0, 200)}`);
  }

  type Result = { url?: string; title?: string; markdown?: string; description?: string };
  const json = (await res.json()) as {
    data?: Result[] | { web?: Result[] };
    web?: Result[];
  };
  const rawList = Array.isArray(json.data)
    ? json.data
    : (json.data?.web ?? json.web ?? []);
  const items = (rawList ?? []).filter((r) => (r.markdown ?? "").length > 200);
  if (items.length === 0) {
    throw new Error("Firecrawl không tìm thấy bài báo nào có nội dung giá xăng.");
  }

  const combined = items
    .slice(0, 3)
    .map(
      (r, i) =>
        `### Bài #${i + 1}: ${r.title ?? "(không tiêu đề)"}\nURL: ${r.url ?? ""}\n\n${r.markdown ?? ""}`,
    )
    .join("\n\n---\n\n");

  return { markdown: combined, sourceUrl: items[0].url ?? PETROLIMEX_URL };
}

const AiExtractSchema = z.object({
  effective_from: z.string().min(1),
  rows: z.array(RowSchema).min(1),
});

async function aiExtract(markdown: string): Promise<z.infer<typeof AiExtractSchema>> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY chưa được cấu hình");

  const system =
    "Bạn là trợ lý trích xuất bảng giá bán lẻ xăng dầu Petrolimex. " +
    "Chỉ trả về JSON đúng schema, KHÔNG kèm văn bản thừa. " +
    "PHẢI luôn trả về ít nhất 4 rows nếu trong nội dung có bất kỳ giá xăng/dầu nào.";

  const user = `Trích xuất bảng giá bán lẻ Petrolimex từ NHIỀU bài báo gộp dưới đây.

Quy tắc:
- "effective_from": ngày & giờ áp dụng kỳ điều hành mới nhất (vd "15:00 — 28/05/2026"). Lấy từ tiêu đề/công văn/đoạn đầu bài báo. Nếu chỉ có ngày, dùng "15:00 — DD/MM/YYYY".
- Mỗi mặt hàng → 1 row với: name (vd "Xăng RON 95-V"), unit ("đồng/lít" hoặc "đồng/kg"),
  zone1 (Vùng 1, số nguyên VND), zone2 (Vùng 2, số nguyên VND).
- Nếu bài chỉ có 1 mức giá (không phân vùng), điền zone1 = zone2 = giá đó.
- Bỏ dấu phẩy/dấu chấm khỏi số tiền trước khi parse (vd "25.050" → 25050).
- Đánh dấu "highlight": true cho 3 mặt hàng phổ biến: RON 95-V, E5 RON 92, Điêzen 0,05S-II.
- Bỏ giá bán buôn/sỉ, chỉ lấy giá bán lẻ.
- Trả về 4–12 rows. KHÔNG được trả mảng rỗng — phải bóc tách bằng được ít nhất các mặt hàng phổ biến (RON 95, E5, Diesel, Dầu hỏa).

MARKDOWN:
${markdown.slice(0, 20000)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
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
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI không trả về nội dung");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI trả về JSON không hợp lệ");
  }
  const result = AiExtractSchema.safeParse(parsed);
  if (!result.success) {
    const preview = JSON.stringify(parsed).slice(0, 300);
    throw new Error(
      `AI bóc tách không ra dữ liệu giá xăng từ nguồn. Kết quả: ${preview}`,
    );
  }
  return result.data;
}

/** Admin: scrape Petrolimex bằng Firecrawl + Lovable AI, lưu thẳng vào DB. */
export const refreshFuelFromPetrolimex = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const { markdown, sourceUrl } = await firecrawlSearchFuel();
    const extracted = await aiExtract(markdown);

    const { error } = await supabaseAdmin.from("vn_fuel_prices_snapshot").upsert({
      id: "latest",
      effective_from: extracted.effective_from,
      source_url: sourceUrl,
      rows: extracted.rows as unknown as never,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    });
    if (error) throw new Error(`DB upsert lỗi: ${error.message}`);
    await supabaseAdmin.from("vn_fuel_prices_history").insert({
      effective_from: extracted.effective_from,
      source_url: sourceUrl,
      rows: extracted.rows as unknown as never,
      source: "auto",
      created_by: userId,
    });
    await logAudit(userId, "fuel_prices.auto_refresh", "vn_fuel_prices_snapshot", "latest", {
      rowCount: extracted.rows.length,
      effective_from: extracted.effective_from,
      source_url: sourceUrl,
    });
    return {
      ok: true,
      effective_from: extracted.effective_from,
      rows: extracted.rows,
      rowCount: extracted.rows.length,
      source_url: sourceUrl,
    };
  });

/** Admin: liệt kê lịch sử cập nhật (mới nhất trước). */
export const listFuelHistory = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("vn_fuel_prices_history")
      .select("id, effective_from, source_url, rows, source, created_at, created_by")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });