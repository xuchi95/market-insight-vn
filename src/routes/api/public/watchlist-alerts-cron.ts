import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend.server";
import { watchlistAlertEmail } from "@/lib/email/templates.server";

const SITE = "https://marketwatch.vn";
const COOLDOWN_HOURS = 6;
const COIN_IDS = [
  "bitcoin", "ethereum", "tether", "binancecoin", "solana",
  "ripple", "dogecoin", "the-open-network", "cardano", "avalanche-2",
  "polkadot", "tron", "chainlink", "polygon", "litecoin",
] as const;

type AssetType = "crypto" | "gold" | "other";

function classify(symbol: string, category: string | null): AssetType {
  const s = symbol.toLowerCase();
  if (s.startsWith("gold-") || s === "xau") return "gold";
  if ((category ?? "").toLowerCase().includes("tiền")) return "crypto";
  if ((category ?? "").toLowerCase().includes("vàng")) return "gold";
  // Treat plain uppercase 2-6 char tickers as crypto by default
  if (/^[A-Za-z]{2,6}$/.test(symbol)) return "crypto";
  return "other";
}

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
    console.error("[watchlist-alerts] crypto fetch failed", e);
  }
  return map;
}

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

async function getOrCreateUnsubToken(userId: string, symbol: string | null): Promise<string> {
  const q = supabaseAdmin
    .from("watchlist_alert_unsubscribe_tokens")
    .select("token")
    .eq("user_id", userId)
    .is("used_at", null);
  const filtered = symbol === null ? q.is("symbol", null) : q.eq("symbol", symbol);
  const { data: existing } = await filtered.maybeSingle();
  if (existing?.token) return existing.token;
  const token = crypto.randomUUID().replace(/-/g, "");
  await supabaseAdmin
    .from("watchlist_alert_unsubscribe_tokens")
    .insert({ token, user_id: userId, symbol });
  return token;
}

interface WatchRow {
  user_id: string;
  symbol: string;
  label: string;
  category: string;
  to_path: string;
  email_alerts_enabled: boolean;
  alert_threshold_pct: number;
  last_alert_sent_at: string | null;
  last_alert_price_usd: number | null;
}

export const Route = createFileRoute("/api/public/watchlist-alerts-cron")({
  server: {
    handlers: {
      POST: async () => {
        const { data: rows, error } = await supabaseAdmin
          .from("watchlist_items")
          .select("user_id,symbol,label,category,to_path,email_alerts_enabled,alert_threshold_pct,last_alert_sent_at,last_alert_price_usd")
          .eq("email_alerts_enabled", true)
          .limit(2000);
        if (error) {
          console.error("[watchlist-alerts] query failed", error);
          return Response.json({ error: "db_error" }, { status: 500 });
        }
        if (!rows || rows.length === 0) return Response.json({ ok: true, checked: 0, sent: 0 });

        // Filter out users with global opt-out
        const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id,email,watchlist_alerts_global_enabled")
          .in("id", userIds);
        const userInfo = new Map<string, { email: string | null; globalEnabled: boolean }>();
        for (const p of profiles ?? []) {
          userInfo.set(p.id, {
            email: p.email,
            globalEnabled: p.watchlist_alerts_global_enabled ?? true,
          });
        }

        const active = (rows as WatchRow[]).filter((r) => {
          const info = userInfo.get(r.user_id);
          return info?.email && info.globalEnabled;
        });
        if (active.length === 0) return Response.json({ ok: true, checked: rows.length, sent: 0 });

        // Group by asset type
        const classified = active.map((r) => ({ row: r, type: classify(r.symbol, r.category) }));
        const needsCrypto = classified.some((c) => c.type === "crypto");
        const needsGold = classified.some((c) => c.type === "gold");
        const [cryptoMap, goldPrice] = await Promise.all([
          needsCrypto ? fetchCryptoPriceMap() : Promise.resolve(new Map<string, number>()),
          needsGold ? fetchGoldPrice() : Promise.resolve(null),
        ]);

        // Load existing snapshots
        const symbolKeys = Array.from(
          new Set(
            classified
              .filter((c) => c.type !== "other")
              .map((c) => snapshotKey(c.row.symbol, c.type)),
          ),
        );
        const { data: snaps } = await supabaseAdmin
          .from("watchlist_price_snapshots")
          .select("symbol,asset_type,price_usd,captured_at")
          .in("symbol", symbolKeys);
        const snapMap = new Map<string, { price: number }>();
        for (const s of snaps ?? []) snapMap.set(s.symbol, { price: Number(s.price_usd) });

        const now = Date.now();
        const cooldownMs = COOLDOWN_HOURS * 3600 * 1000;
        const newSnapshots: { symbol: string; asset_type: string; price_usd: number; captured_at: string }[] = [];
        const seenSnap = new Set<string>();
        let sent = 0;

        for (const { row, type } of classified) {
          if (type === "other") continue;
          const currentPrice =
            type === "gold" ? goldPrice : cryptoMap.get(row.symbol.toUpperCase()) ?? null;
          if (currentPrice == null || !Number.isFinite(currentPrice)) continue;

          const key = snapshotKey(row.symbol, type);
          if (!seenSnap.has(key)) {
            newSnapshots.push({
              symbol: key,
              asset_type: type,
              price_usd: currentPrice,
              captured_at: new Date(now).toISOString(),
            });
            seenSnap.add(key);
          }

          const prevPrice = row.last_alert_price_usd ?? snapMap.get(key)?.price ?? null;
          if (prevPrice == null) continue; // first observation, just record snapshot
          if (prevPrice <= 0) continue;
          const changePct = ((currentPrice - prevPrice) / prevPrice) * 100;
          if (Math.abs(changePct) < Number(row.alert_threshold_pct)) continue;

          const lastSent = row.last_alert_sent_at ? Date.parse(row.last_alert_sent_at) : 0;
          if (now - lastSent < cooldownMs) continue;

          const info = userInfo.get(row.user_id);
          if (!info?.email) continue;

          try {
            const [itemToken, allToken] = await Promise.all([
              getOrCreateUnsubToken(row.user_id, row.symbol),
              getOrCreateUnsubToken(row.user_id, null),
            ]);
            const { subject, html } = watchlistAlertEmail({
              label: row.label,
              symbol: row.symbol,
              changePct,
              previousPrice: prevPrice,
              currentPrice,
              assetPath: row.to_path,
              unsubItemUrl: `${SITE}/huy-canh-bao-theo-doi?token=${itemToken}`,
              unsubAllUrl: `${SITE}/huy-canh-bao-theo-doi?token=${allToken}`,
            });
            await sendEmail({ to: info.email, subject, html, tags: ["watchlist-alert"] });
            await supabaseAdmin
              .from("watchlist_items")
              .update({
                last_alert_sent_at: new Date(now).toISOString(),
                last_alert_price_usd: currentPrice,
              })
              .eq("user_id", row.user_id)
              .eq("symbol", row.symbol);
            sent += 1;
          } catch (e) {
            console.error("[watchlist-alerts] send failed", row.user_id, row.symbol, e);
          }
        }

        if (newSnapshots.length > 0) {
          await supabaseAdmin
            .from("watchlist_price_snapshots")
            .upsert(newSnapshots, { onConflict: "symbol" });
        }

        return Response.json({ ok: true, checked: active.length, sent });
      },
    },
  },
});

function snapshotKey(symbol: string, type: AssetType): string {
  return `${type}:${symbol.toLowerCase()}`;
}