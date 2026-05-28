import { createFileRoute } from "@tanstack/react-router";
import { SAVINGS_RATES, SAVINGS_UPDATED_AT } from "@/lib/data/savingsRates";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ParsedRate } from "@/lib/savings/parser";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Reads the latest scraped snapshot from Techcombank blog (refreshed by
// pg_cron 2x/day). Falls back to curated static dataset if DB is empty
// or unreachable.
export const Route = createFileRoute("/api/public/savings-rates")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          const { data, error } = await supabaseAdmin
            .from("savings_rates_snapshot")
            .select("payload, source, fetched_at, updated_at")
            .eq("id", "latest")
            .maybeSingle();
          if (error) throw error;
          if (data && data.payload) {
            const payload = data.payload as unknown as { items: ParsedRate[]; sourceDate?: string | null };
            if (payload.items && payload.items.length > 0) {
              return Response.json(
                {
                  items: payload.items,
                  updatedAt: payload.sourceDate ?? (data.updated_at ?? "").slice(0, 10),
                  fetchedAt: data.fetched_at,
                  source: data.source ?? "Techcombank blog",
                  note: "Dữ liệu tổng hợp từ blog Techcombank (cập nhật 2 lần/ngày). Vui lòng xác nhận trực tiếp tại ngân hàng trước khi gửi.",
                },
                {
                  headers: {
                    "Cache-Control": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
                    ...CORS,
                  },
                },
              );
            }
          }
        } catch (e) {
          console.error("[savings-rates] DB read failed, falling back to static:", e);
        }
        return Response.json(
          {
            items: SAVINGS_RATES,
            updatedAt: SAVINGS_UPDATED_AT,
            source: "Tổng hợp tham khảo (chưa có snapshot mới)",
            note: "Dữ liệu tham khảo. Vui lòng xác nhận trực tiếp tại ngân hàng trước khi gửi.",
          },
          {
            headers: {
              "Cache-Control": "public, max-age=600, s-maxage=600",
              ...CORS,
            },
          },
        );
      },
    },
  },
});