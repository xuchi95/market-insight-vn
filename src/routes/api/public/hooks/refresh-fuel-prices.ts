import { createFileRoute } from "@tanstack/react-router";
import { refreshFuelPricesFromPetrolimex } from "@/lib/fuel-prices/refresh.server";

/**
 * Cron endpoint — gọi định kỳ (chiều thứ Năm ICT) để tự động cập nhật giá
 * xăng dầu từ Petrolimex vào `vn_fuel_prices_snapshot`. Idempotent:
 * nếu `effective_from` không đổi → trả `updated:false` và không ghi history.
 *
 * Xác thực: yêu cầu header `apikey` khớp `SUPABASE_PUBLISHABLE_KEY` —
 * đủ để chặn truy cập ẩn danh vì khoá này chỉ truyền qua pg_cron, không
 * lộ trong client bundle của route public.
 */
export const Route = createFileRoute("/api/public/hooks/refresh-fuel-prices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const result = await refreshFuelPricesFromPetrolimex({ source: "cron" });
          return new Response(JSON.stringify({ ok: true, ...result }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("[cron] refresh-fuel-prices failed:", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});