import { createFileRoute } from "@tanstack/react-router";
import { SAVINGS_RATES, SAVINGS_UPDATED_AT } from "@/lib/data/savingsRates";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// V1: serves curated static dataset. Anti-bot protection on common
// aggregators (webgia, thebank) blocks raw scraping; upgrade path is to
// add Firecrawl connector + render-mode scrape.
export const Route = createFileRoute("/api/public/savings-rates")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () =>
        Response.json(
          {
            items: SAVINGS_RATES,
            updatedAt: SAVINGS_UPDATED_AT,
            source: "Tổng hợp từ trang chính thức ngân hàng",
            note: "Dữ liệu tham khảo cập nhật định kỳ; vui lòng xác nhận trực tiếp tại ngân hàng trước khi gửi.",
          },
          {
            headers: {
              "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
              ...CORS,
            },
          },
        ),
    },
  },
});