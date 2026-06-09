import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * POST /api/public/analytics/ingest
 *
 * Nhận batch sự kiện analytics ẩn danh từ trình duyệt. Endpoint công khai
 * (bypass auth) nhưng có rate-limit theo IP để chống spam và Zod validate
 * chặt chẽ để không lưu PII / payload lớn.
 *
 *  - Tối đa 30 event / request.
 *  - Tối đa 240 event / phút / IP (~4/s — đủ cho session bình thường).
 *  - Trả 204 nhanh, fail-silent với mọi lỗi nội bộ.
 */

const EVENT_TYPES = [
  "ad_view",
  "ad_render",
  "ad_request",
  "ad_click",
  "pageview",
  "scroll",
  "dwell",
  "click_outbound",
  "click_cta",
  "funnel_step",
] as const;

const SAFE_TEXT = z
  .string()
  .max(256)
  .regex(/^[\x20-\x7E\u00A0-\uFFFF]*$/, "invalid characters");

const EventSchema = z.object({
  event_type: z.enum(EVENT_TYPES),
  ts: z.number().int().positive().optional(),
  session_id: SAFE_TEXT.optional(),
  anon_id: SAFE_TEXT.optional(),
  route: SAFE_TEXT.optional(),
  referrer_host: z.string().max(255).optional(),
  placement: z.string().max(64).optional(),
  ad_slot: z.string().max(64).optional(),
  format: z.string().max(32).optional(),
  target: z.string().max(255).optional(),
  value: z.number().finite().optional(),
  meta: z.record(z.unknown()).optional(),
});

const BatchSchema = z.object({
  events: z.array(EventSchema).min(1).max(30),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

// Rate-limit per IP — in-memory, per-worker. Đủ tốt cho 1 endpoint analytics
// vì drop nhẹ event không ảnh hưởng UX, và worker scale ngang vẫn giữ trần
// chấp nhận được.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 240;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX_PER_WINDOW) return false;
  b.count += 1;
  return true;
}

// GC định kỳ nhẹ nhàng để map không phình.
function gcBuckets() {
  if (buckets.size < 1000) return;
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}

function detectDevice(ua: string | null): string | null {
  if (!ua) return null;
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk(?!.*mobile)/.test(s)) return "tablet";
  if (/mobi|iphone|android.*mobile|phone|ipod|blackberry|opera mini/.test(s)) return "mobile";
  return "desktop";
}

function sanitizeMeta(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object") return null;
  try {
    const s = JSON.stringify(meta);
    if (s.length > 2048) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/analytics/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        if (!rateLimit(ip)) {
          return new Response(null, { status: 204, headers: CORS });
        }
        gcBuckets();

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(null, { status: 204, headers: CORS });
        }
        const parsed = BatchSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(null, { status: 204, headers: CORS });
        }

        const ua = request.headers.get("user-agent");
        const device = detectDevice(ua);
        const country = request.headers.get("cf-ipcountry") || null;

        const rows = parsed.data.events.map((e) => ({
          event_type: e.event_type,
          ts: e.ts ? new Date(e.ts).toISOString() : new Date().toISOString(),
          session_id: e.session_id ?? null,
          anon_id: e.anon_id ?? null,
          route: e.route ?? null,
          referrer_host: e.referrer_host ?? null,
          device,
          country,
          placement: e.placement ?? null,
          ad_slot: e.ad_slot ?? null,
          format: e.format ?? null,
          target: e.target ?? null,
          value: e.value ?? null,
          meta: sanitizeMeta(e.meta),
        }));

        try {
          await supabaseAdmin.from("analytics_events").insert(rows as never);
        } catch {
          /* fail-silent */
        }

        return new Response(null, { status: 204, headers: CORS });
      },
    },
  },
});