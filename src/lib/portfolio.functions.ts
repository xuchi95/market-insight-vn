import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HoldingInput = z.object({
  id: z.string().uuid().optional(),
  asset_type: z.enum(["crypto", "gold"]),
  symbol: z.string().min(1).max(32),
  quantity: z.number().positive(),
  avg_cost_usd: z.number().nullable().optional(),
  avg_cost_vnd: z.number().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const listHoldings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("portfolio_holdings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const upsertHolding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => HoldingInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { error } = await supabase
        .from("portfolio_holdings")
        .update({
          asset_type: data.asset_type,
          symbol: data.symbol,
          quantity: data.quantity,
          avg_cost_usd: data.avg_cost_usd ?? null,
          avg_cost_vnd: data.avg_cost_vnd ?? null,
          note: data.note ?? null,
        })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("portfolio_holdings").insert({
        user_id: userId,
        asset_type: data.asset_type,
        symbol: data.symbol,
        quantity: data.quantity,
        avg_cost_usd: data.avg_cost_usd ?? null,
        avg_cost_vnd: data.avg_cost_vnd ?? null,
        note: data.note ?? null,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteHolding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("portfolio_holdings")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });