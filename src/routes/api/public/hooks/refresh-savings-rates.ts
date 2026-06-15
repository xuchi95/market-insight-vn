import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseTcbBlogMarkdown } from "@/lib/savings/parser";
import { requireCronAuth } from "@/lib/cron-auth.server";

const TCB_URL = "https://techcombank.com/thong-tin/blog/lai-suat-tiet-kiem";

async function firecrawlScrape(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json() as { data?: { markdown?: string }; markdown?: string };
  const md = json.data?.markdown ?? json.markdown;
  if (!md) throw new Error("No markdown returned from Firecrawl");
  return md;
}

async function doRefresh() {
  const md = await firecrawlScrape(TCB_URL);
  const parsed = parseTcbBlogMarkdown(md);
  if (parsed.items.length === 0) {
    throw new Error("Parser returned 0 rows — TCB blog format may have changed");
  }
  const payload = {
    items: parsed.items,
    sourceDate: parsed.sourceDate ?? null,
  };
  // Cron writes to the draft slot only — admin must approve to publish.
  const { error } = await supabaseAdmin
    .from("savings_rates_snapshot")
    .upsert({
      id: "draft",
      payload: payload as unknown as never,
      source: "Techcombank blog",
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`DB upsert failed: ${error.message}`);
  return { count: parsed.items.length, sourceDate: parsed.sourceDate };
}

export const Route = createFileRoute("/api/public/hooks/refresh-savings-rates")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronAuth(request);
        if (unauthorized) return unauthorized;
        try {
          const result = await doRefresh();
          return Response.json({ success: true, ...result });
        } catch (e) {
          console.error("[refresh-savings-rates]", e);
          return Response.json(
            { success: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});