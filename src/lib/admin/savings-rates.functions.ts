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

/** Admin: đọc snapshot hiện tại (latest). */
export const getSavingsSnapshot = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("savings_rates_snapshot")
      .select("payload, source, fetched_at, updated_at")
      .eq("id", "latest")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const payload = (data?.payload ?? { items: [] }) as unknown as { items: ParsedRate[]; sourceDate?: string | null };
    return {
      items: payload.items ?? [],
      sourceDate: payload.sourceDate ?? null,
      source: data?.source ?? "Tổng hợp",
      fetched_at: data?.fetched_at ?? null,
      updated_at: data?.updated_at ?? null,
    };
  });

/** Admin: lưu snapshot do biên tập viên chỉnh tay. */
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
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("savings_rates_snapshot").upsert({
      id: "latest",
      payload: {
        items: data.items,
        sourceDate: data.sourceDate ?? null,
      } as unknown as never,
      source: data.source ?? "Biên tập viên",
      fetched_at: now,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
    await logAudit(userId, "savings_rates.save", "savings_rates_snapshot", "latest", {
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

/** Admin: scrape Techcombank blog, parse, lưu vào DB. */
export const refreshSavingsFromTcb = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const md = await firecrawlScrape("https://techcombank.com/thong-tin/blog/lai-suat-tiet-kiem");
    const parsed = parseTcbBlogMarkdown(md);
    if (parsed.items.length === 0) {
      throw new Error("Parser trả về 0 dòng — định dạng blog có thể đã thay đổi");
    }
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("savings_rates_snapshot").upsert({
      id: "latest",
      payload: {
        items: parsed.items,
        sourceDate: parsed.sourceDate ?? null,
      } as unknown as never,
      source: "Techcombank blog",
      fetched_at: now,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
    await logAudit(userId, "savings_rates.auto_refresh", "savings_rates_snapshot", "latest", {
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