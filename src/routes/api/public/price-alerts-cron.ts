import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/mailgun.server";
import { priceAlertEmail } from "@/lib/email/templates.server";

const COIN_IDS = [
  "bitcoin", "ethereum", "tether", "binancecoin", "solana",
  "ripple", "dogecoin", "the-open-network", "cardano", "avalanche-2",
] as const;

// Call CoinGecko directly — avoids an extra worker invocation by skipping
// the internal /api/public/crypto round-trip.
async function fetchCryptoPriceMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("ids", COIN_IDS.join(","));
    const headers: Record<string, string> = { accept: "application/json" };
    const key = process.env.COINGECKO_API_KEY;
    if (key) headers["x-cg-demo-api-key"] = key;
    const res = await fetch(url, { headers });
    if (!res.ok) return map;
    const data: any[] = await res.json();
    for (const c of data ?? []) {
      const sym = String(c?.symbol ?? "").toUpperCase();
      const price = Number(c?.current_price);
      if (sym && Number.isFinite(price)) map.set(sym, price);
    }
  } catch (e) {
    console.error("crypto fetch failed", e);
  }
  return map;
}

// Call gold-api.com directly (same upstream as /api/public/xau).
async function fetchGoldPrice(): Promise<number | null> {
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU", { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const json: any = await res.json();
    const price = Number(json?.price);
    return Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}

interface AlertRow {
  id: string;
  user_id: string;
  symbol: string;
  asset_type: "crypto" | "gold";
  direction: "above" | "below";
  threshold_usd: number;
  email_enabled: boolean;
}

export const Route = createFileRoute("/api/public/price-alerts-cron")({
  server: {
    handlers: {
      POST: async () => {
        const { data: alerts, error } = await supabaseAdmin
          .from("user_price_alerts")
          .select("id,user_id,symbol,asset_type,direction,threshold_usd,email_enabled")
          .eq("triggered", false)
          .eq("email_enabled", true)
          .limit(500);
        if (error) {
          console.error("alerts query failed", error);
          return Response.json({ error: "db_error" }, { status: 500 });
        }
        if (!alerts || alerts.length === 0) {
          return Response.json({ ok: true, checked: 0, triggered: 0 });
        }

        const needsCrypto = alerts.some((a) => a.asset_type === "crypto");
        const needsGold = alerts.some((a) => a.asset_type === "gold");
        const [cryptoMap, goldPrice] = await Promise.all([
          needsCrypto ? fetchCryptoPriceMap() : Promise.resolve(new Map<string, number>()),
          needsGold ? fetchGoldPrice() : Promise.resolve(null),
        ]);

        const userIds = Array.from(new Set(alerts.map((a) => a.user_id)));
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id,email")
          .in("id", userIds);
        const emailById = new Map<string, string>();
        for (const p of profiles ?? []) if (p.email) emailById.set(p.id, p.email);

        let triggered = 0;
        for (const a of alerts as AlertRow[]) {
          const price = a.asset_type === "gold" ? goldPrice : cryptoMap.get(a.symbol.toUpperCase()) ?? null;
          if (price == null || !Number.isFinite(price)) continue;
          const threshold = Number(a.threshold_usd);
          const hit = a.direction === "above" ? price >= threshold : price <= threshold;
          if (!hit) continue;

          const to = emailById.get(a.user_id);
          if (to) {
            try {
              const { subject, html } = priceAlertEmail({
                symbol: a.symbol,
                assetType: a.asset_type,
                direction: a.direction,
                threshold,
                currentPrice: price,
              });
              await sendEmail({ to, subject, html, tags: ["price-alert"] });
            } catch (e) {
              console.error("alert email failed", a.id, e);
              continue;
            }
          }
          await supabaseAdmin
            .from("user_price_alerts")
            .update({ triggered: true, triggered_at: new Date().toISOString(), last_price_usd: price })
            .eq("id", a.id);
          triggered += 1;
        }

        return Response.json({ ok: true, checked: alerts.length, triggered });
      },
    },
  },
});