import { createFileRoute } from "@tanstack/react-router";
import { verifyApiKey, unauthorized, CORS_HEADERS } from "@/lib/api-keys.server";

/**
 * Server-Sent Events stream — push snapshot giá mỗi `interval` giây.
 *
 * Cách dùng phía client:
 *   const ev = new EventSource("https://marketwatch.vn/api/public/v1/stream?api_key=mw_live_xxx&scopes=gold,crypto");
 *   ev.addEventListener("snapshot", (e) => console.log(JSON.parse(e.data)));
 *
 * EventSource KHÔNG cho phép custom header → khuyên dùng query `?api_key=`
 * cho SSE (hoặc dùng REST + polling nếu cần header). Tham số `interval` (giây,
 * 5–60) điều chỉnh tần suất push.
 */

const SCOPE_ALL = ["gold", "crypto", "fuel", "stocks"] as const;
type Scope = (typeof SCOPE_ALL)[number];

const MIN_INTERVAL = 5;
const MAX_INTERVAL = 60;
const DEFAULT_INTERVAL = 10;
/** Tự đóng sau ~30 phút để client tự reconnect (tránh giữ Worker quá lâu). */
const MAX_DURATION_MS = 30 * 60 * 1000;

async function fetchScope(origin: string, scope: Scope): Promise<unknown> {
  const path =
    scope === "gold" ? "/api/public/gold" :
    scope === "crypto" ? "/api/public/crypto" :
    scope === "fuel" ? "/api/public/oil" :
    "/api/public/stocks";
  try {
    const res = await fetch(`${origin}${path}`, { headers: { accept: "application/json" } });
    if (!res.ok) return { error: `upstream ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: (e as Error).message };
  }
}

function sseEvent(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

export const Route = createFileRoute("/api/public/v1/stream")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const auth = await verifyApiKey(request);
        if (!auth) return unauthorized();

        const url = new URL(request.url);
        const interval = Math.min(
          MAX_INTERVAL,
          Math.max(MIN_INTERVAL, Number(url.searchParams.get("interval")) || DEFAULT_INTERVAL),
        );
        const requested = (url.searchParams.get("scopes") ?? "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean) as Scope[];
        const allowed = new Set(auth.scopes);
        const wanted = (requested.length ? requested : [...SCOPE_ALL]).filter(
          (s): s is Scope => (SCOPE_ALL as readonly string[]).includes(s) && allowed.has(s),
        );
        const origin = `${url.protocol}//${url.host}`;

        const startAt = Date.now();
        let timer: ReturnType<typeof setTimeout> | null = null;
        let closed = false;

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const push = async () => {
              if (closed) return;
              if (Date.now() - startAt > MAX_DURATION_MS) {
                try { controller.enqueue(sseEvent("close", { reason: "max_duration" })); } catch {}
                try { controller.close(); } catch {}
                closed = true;
                return;
              }
              try {
                const entries = await Promise.all(
                  wanted.map(async (s) => [s, await fetchScope(origin, s)] as const),
                );
                const data = Object.fromEntries(entries);
                controller.enqueue(
                  sseEvent("snapshot", { generatedAt: Date.now(), scopes: wanted, data }),
                );
              } catch (e) {
                try { controller.enqueue(sseEvent("error", { message: (e as Error).message })); } catch {}
              }
              timer = setTimeout(push, interval * 1000);
            };
            // Hello + first snapshot ngay khi connect.
            controller.enqueue(
              sseEvent("hello", {
                ok: true,
                interval,
                scopes: wanted,
                key: { id: auth.id, name: auth.name },
              }),
            );
            void push();
          },
          cancel() {
            closed = true;
            if (timer) clearTimeout(timer);
          },
        });

        // Đóng stream khi client disconnect.
        request.signal.addEventListener("abort", () => {
          closed = true;
          if (timer) clearTimeout(timer);
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-store, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            ...CORS_HEADERS,
          },
        });
      },
    },
  },
});