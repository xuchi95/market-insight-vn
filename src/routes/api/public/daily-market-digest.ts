import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend.server";
import {
  goldDigestEmail,
  cryptoDigestEmail,
  fxDigestEmail,
  type GoldDigestRow,
  type CoinDigestRow,
  type FxDigestRow,
} from "@/lib/email/templates.server";

const SITE = "https://marketwatch.vn";
const OZ_PER_LUONG = 1.20556;

// --- Data fetchers (best-effort; null on failure) ---

async function fetchFmpQuote(symbol: string): Promise<{ price: number; changePct: number | null } | null> {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${key}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ price?: number; changesPercentage?: number }>;
    const row = arr?.[0];
    if (!row || typeof row.price !== "number") return null;
    return {
      price: row.price,
      changePct: typeof row.changesPercentage === "number" ? row.changesPercentage : null,
    };
  } catch {
    return null;
  }
}

async function fetchGoldRows(): Promise<GoldDigestRow[]> {
  const [xau, usdvnd] = await Promise.all([fetchFmpQuote("XAUUSD"), fetchFmpQuote("USDVND")]);
  if (!xau || !usdvnd) return [];
  const vndPerLuong = xau.price * usdvnd.price * OZ_PER_LUONG;
  // Approximate spread (~0.5%) since FMP only gives a single spot price.
  const sell = Math.round(vndPerLuong / 1000) * 1000;
  const buy = Math.round((vndPerLuong * 0.995) / 1000) * 1000;
  return [
    { label: "Vàng SJC (ước tính)", buy, sell, changePct: xau.changePct },
    {
      label: "XAU/USD",
      buy: null,
      sell: Math.round(xau.price),
      changePct: xau.changePct,
    },
  ];
}

async function fetchCryptoRows(): Promise<CoinDigestRow[]> {
  try {
    const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("order", "market_cap_desc");
    url.searchParams.set("per_page", "5");
    url.searchParams.set("page", "1");
    url.searchParams.set("price_change_percentage", "24h");
    const headers: Record<string, string> = { accept: "application/json" };
    const key = process.env.COINGECKO_API_KEY;
    if (key) headers["x-cg-demo-api-key"] = key;
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const arr = (await res.json()) as Array<{
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number | null;
    }>;
    return arr
      .filter((c) => typeof c.current_price === "number")
      .map((c) => ({
        symbol: c.symbol,
        name: c.name,
        price: c.current_price,
        changePct: typeof c.price_change_percentage_24h === "number" ? c.price_change_percentage_24h : 0,
      }));
  } catch {
    return [];
  }
}

async function fetchFxRows(): Promise<FxDigestRow[]> {
  const pairs: Array<{ symbol: string; pair: string }> = [
    { symbol: "USDVND", pair: "USD/VND" },
    { symbol: "EURVND", pair: "EUR/VND" },
    { symbol: "JPYVND", pair: "JPY/VND" },
    { symbol: "GBPVND", pair: "GBP/VND" },
  ];
  const quotes = await Promise.all(pairs.map((p) => fetchFmpQuote(p.symbol)));
  return pairs
    .map((p, i) => {
      const q = quotes[i];
      if (!q) return null;
      return { pair: p.pair, rate: q.price, changePct: q.changePct } satisfies FxDigestRow;
    })
    .filter((r): r is FxDigestRow => r !== null);
}

// --- Route ---

export const Route = createFileRoute("/api/public/daily-market-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { data: subs, error } = await supabaseAdmin
          .from("newsletter_subscribers")
          .select("id, email, topics, unsubscribe_token")
          .is("unsubscribed_at", null)
          .not("confirmed_at", "is", null);
        if (error) {
          console.error("daily-digest: load subs failed", error);
          return Response.json({ error: "db_error" }, { status: 500 });
        }

        const wanted = new Set<string>();
        for (const s of subs ?? []) for (const t of s.topics ?? []) wanted.add(String(t));

        const [goldRows, cryptoRows, fxRows] = await Promise.all([
          wanted.has("gold") ? fetchGoldRows() : Promise.resolve([] as GoldDigestRow[]),
          wanted.has("btc") ? fetchCryptoRows() : Promise.resolve([] as CoinDigestRow[]),
          wanted.has("usd") ? fetchFxRows() : Promise.resolve([] as FxDigestRow[]),
        ]);

        const dateLabel = new Date().toLocaleDateString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          day: "2-digit", month: "2-digit", year: "numeric",
        });

        let sent = 0;
        let failed = 0;
        for (const sub of subs ?? []) {
          const topics = new Set((sub.topics ?? []).map(String));
          const unsubUrl = `${SITE}/huy-ban-tin?token=${encodeURIComponent(sub.unsubscribe_token)}`;
          const jobs: Array<{ tag: string; build: () => { subject: string; html: string } }> = [];
          if (topics.has("gold") && goldRows.length) {
            jobs.push({ tag: "daily-gold-digest", build: () => goldDigestEmail({ dateLabel, rows: goldRows, unsubUrl }) });
          }
          if (topics.has("btc") && cryptoRows.length) {
            jobs.push({ tag: "daily-crypto-digest", build: () => cryptoDigestEmail({ dateLabel, rows: cryptoRows, unsubUrl }) });
          }
          if (topics.has("usd") && fxRows.length) {
            jobs.push({ tag: "daily-fx-digest", build: () => fxDigestEmail({ dateLabel, rows: fxRows, unsubUrl }) });
          }
          for (const job of jobs) {
            try {
              const { subject, html } = job.build();
              await sendEmail({ to: sub.email, subject, html, tags: [job.tag], stream: "broadcast" });
              sent++;
            } catch (e) {
              console.error("daily-digest send failed", sub.email, job.tag, e);
              failed++;
            }
          }
        }

        return Response.json({
          ok: true,
          subscribers: subs?.length ?? 0,
          sent,
          failed,
          topics: { gold: goldRows.length, crypto: cryptoRows.length, fx: fxRows.length },
        });
      },
    },
  },
});