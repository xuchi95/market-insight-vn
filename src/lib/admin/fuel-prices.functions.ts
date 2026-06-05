import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { refreshFuelPricesFromPetrolimex } from "@/lib/fuel-prices/refresh.server";

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
  .inputValidator((data: unknown) => {
    const result = SnapshotSchema.safeParse(data);
    if (!result.success) {
      const first = result.error.issues[0];
      const path = first.path.join(".") || "dữ liệu";
      const reason =
        first.code === "too_small" && first.path[0] === "rows"
          ? "Bảng phải có ít nhất 1 mặt hàng."
          : `${path}: ${first.message}`;
      throw new Error(`Dữ liệu không hợp lệ — ${reason}`);
    }
    return result.data;
  })
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

/** Admin: scrape Petrolimex bằng Firecrawl + Lovable AI, lưu thẳng vào DB. */
export const refreshFuelFromPetrolimex = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const result = await refreshFuelPricesFromPetrolimex({ source: "auto", userId });
    await logAudit(userId, "fuel_prices.auto_refresh", "vn_fuel_prices_snapshot", "latest", {
      rowCount: result.rowCount,
      effective_from: result.effective_from,
      source_url: result.source_url,
      updated: result.updated,
    });
    return {
      ok: true,
      updated: result.updated,
      effective_from: result.effective_from,
      previous_effective_from: result.previous_effective_from,
      rows: result.rows,
      rowCount: result.rowCount,
      source_url: result.source_url,
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