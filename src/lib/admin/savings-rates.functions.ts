import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseTcbBlogMarkdown, type ParsedRate, type Tenor } from "@/lib/savings/parser";

const TENORS: Tenor[] = ["m1", "m3", "m6", "m9", "m12", "m13", "m18", "m24", "m36"];

const RateSchema = z.object({
  bank: z.string().trim().min(1).max(120),
  shortName: z.string().trim().min(1).max(20),
  group: z.enum(["SOCB", "Joint-Stock", "Foreign"]),
  rates: z.record(z.enum(TENORS as [Tenor, ...Tenor[]]), z.number().min(0).max(30)),
});

const SnapshotSchema = z.object({
  items: z.array(RateSchema).min(1).max(100),
  sourceDate: z.string().trim().max(40).optional().nullable(),
  source: z.string().trim().max(120).optional(),
});

export type SavingsRateInput = z.infer<typeof RateSchema>;

type SnapshotMeta = {
  items: ParsedRate[];
  sourceDate: string | null;
  source: string;
  fetched_at: string | null;
  updated_at: string | null;
};

const EMPTY_META: SnapshotMeta = {
  items: [],
  sourceDate: null,
  source: "Tổng hợp",
  fetched_at: null,
  updated_at: null,
};

async function readSnapshot(id: "draft" | "published"): Promise<SnapshotMeta> {
  const { data, error } = await supabaseAdmin
    .from("savings_rates_snapshot")
    .select("payload, source, fetched_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return EMPTY_META;
  const payload = (data.payload ?? { items: [] }) as unknown as {
    items: ParsedRate[];
    sourceDate?: string | null;
  };
  return {
    items: payload.items ?? [],
    sourceDate: payload.sourceDate ?? null,
    source: data.source ?? "Tổng hợp",
    fetched_at: data.fetched_at ?? null,
    updated_at: data.updated_at ?? null,
  };
}

async function writeSnapshot(
  id: "draft" | "published",
  items: ParsedRate[],
  sourceDate: string | null,
  source: string,
) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("savings_rates_snapshot").upsert({
    id,
    payload: { items, sourceDate } as unknown as never,
    source,
    fetched_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);
}

/** Admin: đọc cả bản nháp và bản đã công bố để hiển thị trên dashboard. */
export const getSavingsSnapshot = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const [draft, published] = await Promise.all([
      readSnapshot("draft"),
      readSnapshot("published"),
    ]);
    return { draft, published };
  });

/** Admin: lưu snapshot do biên tập viên chỉnh tay (chỉ ghi vào bản nháp). */
export const saveSavingsSnapshot = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => {
    const r = SnapshotSchema.safeParse(data);
    if (!r.success) {
      const f = r.error.issues[0];
      throw new Error(`Dữ liệu không hợp lệ — ${f.path.join(".") || "payload"}: ${f.message}`);
    }
    return r.data;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await writeSnapshot(
      "draft",
      data.items as ParsedRate[],
      data.sourceDate ?? null,
      data.source ?? "Biên tập viên",
    );
    await logAudit(userId, "savings_rates.save_draft", "savings_rates_snapshot", "draft", {
      count: data.items.length,
      sourceDate: data.sourceDate ?? null,
    });
    return { ok: true, count: data.items.length };
  });

async function firecrawlScrape(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY chưa được cấu hình");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: { markdown?: string }; markdown?: string };
  const md = json.data?.markdown ?? json.markdown;
  if (!md) throw new Error("Firecrawl không trả về markdown");
  return md;
}

/** Admin: scrape Techcombank blog, parse, lưu vào bản nháp (chưa công bố). */
export const refreshSavingsFromTcb = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const md = await firecrawlScrape("https://techcombank.com/thong-tin/blog/lai-suat-tiet-kiem");
    const parsed = parseTcbBlogMarkdown(md);
    if (parsed.items.length === 0) {
      throw new Error("Parser trả về 0 dòng — định dạng blog có thể đã thay đổi");
    }
    await writeSnapshot("draft", parsed.items, parsed.sourceDate ?? null, "Techcombank blog");
    await logAudit(userId, "savings_rates.auto_refresh", "savings_rates_snapshot", "draft", {
      count: parsed.items.length,
      sourceDate: parsed.sourceDate ?? null,
    });
    return {
      ok: true,
      items: parsed.items,
      sourceDate: parsed.sourceDate ?? null,
      count: parsed.items.length,
    };
  });

/** Admin: phê duyệt bản nháp hiện tại và đẩy ra trang người dùng. */
export const publishSavingsSnapshot = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const draft = await readSnapshot("draft");
    if (draft.items.length === 0) {
      throw new Error("Bản nháp rỗng — không có gì để công bố");
    }
    await writeSnapshot("published", draft.items, draft.sourceDate, draft.source);
    // Cập nhật cả 'latest' để fallback của public endpoint vẫn nhất quán
    await writeSnapshot("latest" as "published", draft.items, draft.sourceDate, draft.source);
    await logAudit(userId, "savings_rates.publish", "savings_rates_snapshot", "published", {
      count: draft.items.length,
      sourceDate: draft.sourceDate,
    });
    return { ok: true, count: draft.items.length };
  });

/** Admin: huỷ thay đổi trong bản nháp, sao chép lại từ bản đã công bố. */
export const discardSavingsDraft = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const published = await readSnapshot("published");
    if (published.items.length === 0) {
      throw new Error("Chưa có bản công bố nào để khôi phục");
    }
    await writeSnapshot("draft", published.items, published.sourceDate, published.source);
    await logAudit(userId, "savings_rates.discard_draft", "savings_rates_snapshot", "draft", {
      count: published.items.length,
    });
    return { ok: true, count: published.items.length };
  });