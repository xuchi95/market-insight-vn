import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchDigestData, sendDigestTo, ALL_DIGEST_TOPICS, type DigestTopic } from "@/lib/email/digest.server";

const VALID_TOPICS: DigestTopic[] = ALL_DIGEST_TOPICS;
const DEFAULT_TOPICS: DigestTopic[] = ["gold", "btc", "usd"];

function normalizeTopics(input: unknown): DigestTopic[] {
  if (!Array.isArray(input)) return [...DEFAULT_TOPICS];
  const out = input
    .map((s) => String(s).toLowerCase())
    .filter((s): s is DigestTopic => (VALID_TOPICS as string[]).includes(s));
  return out.length ? out : [...DEFAULT_TOPICS];
}

export const Route = createFileRoute("/api/public/newsletter-weekly-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Light protection: require Supabase apikey header (matches our pg_cron pattern).
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { data: subs, error } = await supabaseAdmin
          .from("newsletter_subscribers")
          .select("id, email, topics, unsubscribe_token, user_id")
          .is("unsubscribed_at", null)
          .not("confirmed_at", "is", null);
        if (error) {
          console.error("digest: load subs failed", error);
          return Response.json({ error: "db_error" }, { status: 500 });
        }

        // Load default presets in one shot for subscribers that have a user_id.
        const userIds = Array.from(
          new Set((subs ?? []).map((s) => s.user_id).filter(Boolean) as string[]),
        );
        const defaultsByUser = new Map<string, string[]>();
        if (userIds.length) {
          const { data: presets } = await supabaseAdmin
            .from("newsletter_topic_presets")
            .select("user_id, topics")
            .in("user_id", userIds)
            .eq("is_default", true);
          for (const p of presets ?? []) {
            if (p.user_id && Array.isArray(p.topics)) {
              defaultsByUser.set(p.user_id, p.topics as string[]);
            }
          }
        }

        // Pre-fetch full data once; trim per recipient by their topics.
        const allSeries = await fetchDigestData([...VALID_TOPICS]);
        const seriesByTopic = new Map(allSeries.map((s) => [s.topic, s]));

        let sent = 0;
        let failed = 0;
        for (const sub of subs ?? []) {
          const presetTopics = sub.user_id ? defaultsByUser.get(sub.user_id) : undefined;
          const topics = normalizeTopics(presetTopics ?? sub.topics);
          const series = topics
            .map((t) => seriesByTopic.get(t))
            .filter((s): s is NonNullable<typeof s> => !!s);
          if (series.length === 0) continue;
          try {
            await sendDigestTo({
              email: sub.email,
              unsubscribeToken: sub.unsubscribe_token,
              series,
            });
            await supabaseAdmin
              .from("newsletter_subscribers")
              .update({ last_digest_sent_at: new Date().toISOString() })
              .eq("id", sub.id);
            sent++;
          } catch (e) {
            console.error("digest send failed", sub.email, e);
            failed++;
          }
        }

        return Response.json({ ok: true, total: subs?.length ?? 0, sent, failed });
      },
    },
  },
});