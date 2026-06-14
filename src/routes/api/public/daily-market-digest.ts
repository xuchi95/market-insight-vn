import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend.server";
import { requireCronAuth } from "@/lib/cron-auth.server";
import {
  goldDigestEmail,
  cryptoDigestEmail,
  fxDigestEmail,
  type GoldDigestRow,
  type CoinDigestRow,
  type FxDigestRow,
} from "@/lib/email/templates.server";
import {
  fetchDailyGoldRows,
  fetchDailyCryptoRows,
  fetchDailyFxRows,
} from "@/lib/email/daily-digest.server";

const SITE = "https://marketwatch.vn";

// --- Route ---

export const Route = createFileRoute("/api/public/daily-market-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronAuth(request);
        if (unauthorized) return unauthorized;

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
          wanted.has("gold") ? fetchDailyGoldRows() : Promise.resolve([] as GoldDigestRow[]),
          wanted.has("btc") ? fetchDailyCryptoRows() : Promise.resolve([] as CoinDigestRow[]),
          wanted.has("usd") ? fetchDailyFxRows() : Promise.resolve([] as FxDigestRow[]),
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