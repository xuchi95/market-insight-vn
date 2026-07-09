import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Lightweight in-memory rollup of API hits. We batch by minute bucket +
 * endpoint and flush to `api_request_metrics` every ~15s (or when the
 * buffer grows). Each Worker instance keeps its own buffer; the DB upsert
 * sums across instances atomically.
 */

type Counter = { count: number; total_ms: number; errors: number };
const buffer = new Map<string, Counter>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight = false;

const FLUSH_MS = 15_000;
const MAX_BUFFER = 200;

function bucketIso(now = Date.now()): string {
  return new Date(Math.floor(now / 60_000) * 60_000).toISOString();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_MS);
}

async function flush() {
  if (flushInFlight || buffer.size === 0) return;
  flushInFlight = true;
  const snapshot = Array.from(buffer.entries());
  buffer.clear();
  try {
    for (const [key, c] of snapshot) {
      const sep = key.indexOf("|");
      const bucket = key.slice(0, sep);
      const endpoint = key.slice(sep + 1);
      // Fire and forget; one row per (bucket, endpoint). RPC is atomic.
      await supabaseAdmin.rpc("bump_api_metrics", {
        p_bucket: bucket,
        p_endpoint: endpoint,
        p_count: c.count,
        p_total_ms: c.total_ms,
        p_errors: c.errors,
      });
    }
  } catch {
    // Swallow — metrics must never affect the request path. Lost rows are
    // acceptable for a best-effort observability stream.
  } finally {
    flushInFlight = false;
  }
}

function record(endpoint: string, durationMs: number, ok: boolean) {
  const key = `${bucketIso()}|${endpoint}`;
  const cur = buffer.get(key) ?? { count: 0, total_ms: 0, errors: 0 };
  cur.count += 1;
  cur.total_ms += Math.max(0, Math.round(durationMs));
  if (!ok) cur.errors += 1;
  buffer.set(key, cur);
  if (buffer.size >= MAX_BUFFER) void flush();
  else scheduleFlush();
}

// ---------------------------------------------------------------------------
// Ad-hoc per-IP rate limiting for public read endpoints.
//
// Lovable Cloud's Worker runtime has no shared rate-limit primitive. This is
// an in-memory sliding window kept PER isolate — it reduces casual abuse and
// small floods, but cannot fully stop a distributed DDoS (many isolates ×
// many source IPs). For real DDoS protection, enable Cloudflare Rate
// Limiting Rules / WAF at the edge on the custom domain.
//
// Defaults chosen for read-only price endpoints polled every ~15–30s by
// legitimate browsers: 90 req/min/IP per endpoint (~1 every 0.7s) is well
// above normal but chokes scripted floods.
// ---------------------------------------------------------------------------

type Bucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, Bucket>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 90;
const RATE_MAX_BUCKETS = 20_000; // hard cap on memory footprint per isolate

function clientIpOf(req: Request): string {
  // Cloudflare sets CF-Connecting-IP; also honour standard forwarded headers
  // as fallbacks. Never trust the raw remote address for rate-limit keys —
  // downstream is always CF.
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

function takeToken(endpoint: string, ip: string, now: number): { ok: boolean; retryAfter: number } {
  const key = `${endpoint}|${ip}`;
  let b = rateBuckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(key, b);
  }
  b.count += 1;
  if (b.count > RATE_MAX) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  // Opportunistic cleanup when the map grows too large.
  if (rateBuckets.size > RATE_MAX_BUCKETS) {
    for (const [k, v] of rateBuckets) {
      if (v.resetAt <= now) rateBuckets.delete(k);
      if (rateBuckets.size <= RATE_MAX_BUCKETS / 2) break;
    }
  }
  return { ok: true, retryAfter: 0 };
}

function rateLimited(endpoint: string, retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "rate_limited", retryAfter }),
    {
      status: 429,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "retry-after": String(retryAfter),
        "x-ratelimit-endpoint": endpoint,
      },
    },
  );
}

/**
 * Wrap a server-route handler so each invocation is counted.
 * Typed loosely as (ctx: any) => Promise<Response> so TanStack's per-route
 * handler context (which includes request, params, context, ...) still
 * flows through without TS friction at the call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function instrument(
  endpoint: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (ctx: any) => Promise<Response>,
): (ctx: any) => Promise<Response> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (ctx: any) => {
    const start = Date.now();
    let ok = true;
    try {
      // Auto-apply per-IP rate limit to public.* endpoints. `instrument` is
      // already used on every public read handler, so this covers them all
      // without touching each route file.
      if (endpoint.startsWith("public.") && ctx?.request instanceof Request) {
        const ip = clientIpOf(ctx.request);
        const gate = takeToken(endpoint, ip, start);
        if (!gate.ok) {
          const res = rateLimited(endpoint, gate.retryAfter);
          ok = false; // count as error so it shows up in metrics
          return res;
        }
      }
      const res = await handler(ctx);
      ok = res.status < 500;
      return res;
    } catch (e) {
      ok = false;
      throw e;
    } finally {
      record(endpoint, Date.now() - start, ok);
    }
  };
}