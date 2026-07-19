import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Danh sách các loại vàng cho phép admin ghi đè — khớp với `id` trong
 * `PNJ_MAP` / `BTMC_MAP` ở `src/routes/api/public/gold.ts`. Chỉ giới hạn
 * các loại phổ biến để tránh nhầm mã.
 */
export const GOLD_OVERRIDE_CATALOG: {
  id: string;
  brand: string;
  type: string;
}[] = [
  { id: "sjc-1l", brand: "SJC", type: "Vàng miếng SJC 1L" },
  { id: "pnj", brand: "PNJ", type: "Vàng PNJ - Phượng Hoàng" },
  { id: "pnj-nhan", brand: "PNJ", type: "Nhẫn Trơn PNJ 999.9" },
  { id: "pnj-kimbao", brand: "PNJ", type: "Vàng Kim Bảo 999.9" },
  { id: "pnj-tailoc", brand: "PNJ", type: "Vàng Phúc Lộc Tài 999.9" },
  { id: "btmc-vrtl", brand: "Bảo Tín Minh Châu", type: "Vàng miếng Rồng Thăng Long" },
  { id: "btmc-nhan", brand: "Bảo Tín Minh Châu", type: "Nhẫn tròn trơn 9999" },
  { id: "doji", brand: "DOJI", type: "Vàng miếng 9999" },
  { id: "nutrang-9999", brand: "Vàng 24K", type: "Vàng nữ trang 999.9" },
  { id: "nutrang-18k", brand: "Vàng 18K", type: "Vàng 750 (18K)" },
];

export type GoldOverrideRow = {
  gold_id: string;
  brand: string;
  type: string;
  buy: number;
  sell: number;
  unit: string;
  note: string | null;
  effective_at: string;
  expires_at: string | null;
  updated_at: string;
};

const UpsertSchema = z.object({
  gold_id: z.string().trim().min(1).max(64),
  brand: z.string().trim().min(1).max(80),
  type: z.string().trim().min(1).max(120),
  buy: z.number().int().min(1_000_000).max(1_000_000_000),
  sell: z.number().int().min(1_000_000).max(1_000_000_000),
  unit: z.string().trim().min(1).max(20).default("VND/chỉ"),
  note: z.string().trim().max(500).nullish(),
  effective_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().nullish(),
});

/** Admin: liệt kê toàn bộ override (kể cả đã hết hạn — để dễ audit). */
export const listGoldOverrides = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("gold_price_overrides")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as GoldOverrideRow[], catalog: GOLD_OVERRIDE_CATALOG };
  });

/** Admin: thêm/cập nhật một override. */
export const upsertGoldOverride = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => {
    const r = UpsertSchema.safeParse(data);
    if (!r.success) {
      const f = r.error.issues[0];
      throw new Error(`Dữ liệu không hợp lệ — ${f.path.join(".") || "payload"}: ${f.message}`);
    }
    if (r.data.sell < r.data.buy) throw new Error("Giá bán phải >= giá mua");
    return r.data;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const { error } = await supabaseAdmin.from("gold_price_overrides").upsert({
      gold_id: data.gold_id,
      brand: data.brand,
      type: data.type,
      buy: data.buy,
      sell: data.sell,
      unit: data.unit,
      note: data.note ?? null,
      effective_at: data.effective_at ?? new Date().toISOString(),
      expires_at: data.expires_at ?? null,
      updated_by: userId,
    });
    if (error) throw new Error(error.message);
    await logAudit(userId, "gold_overrides.upsert", "gold_price_overrides", data.gold_id, {
      buy: data.buy,
      sell: data.sell,
    });
    return { ok: true };
  });

/** Admin: xoá override — trả lại giá gốc từ upstream (PNJ/BTMC). */
export const deleteGoldOverride = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ gold_id: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const { error } = await supabaseAdmin
      .from("gold_price_overrides")
      .delete()
      .eq("gold_id", data.gold_id);
    if (error) throw new Error(error.message);
    await logAudit(userId, "gold_overrides.delete", "gold_price_overrides", data.gold_id, {});
    return { ok: true };
  });