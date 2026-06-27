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

/**
 * Wrap a server-route handler so each invocation is counted.
 * Usage:
 *   GET: instrument("public.crypto", async ({ request }) => { ... })
 */
export function instrument<TArgs extends unknown[], TRes extends Response>(
  endpoint: string,
  handler: (...args: TArgs) => Promise<TRes>,
): (...args: TArgs) => Promise<TRes> {
  return async (...args: TArgs) => {
    const start = Date.now();
    let ok = true;
    try {
      const res = await handler(...args);
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