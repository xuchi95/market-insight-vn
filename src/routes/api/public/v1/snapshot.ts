import { createFileRoute } from "@tanstack/react-router";
import { verifyApiKey, unauthorized, CORS_HEADERS } from "@/lib/api-keys.server";

/**
 * REST aggregate snapshot — trả về toàn bộ dữ liệu giá hiện tại trong 1 lần gọi.
 * Dành cho bên thứ ba tích hợp đơn giản (không cần stream).
 *
 * Cách dùng:
 *   GET /api/public/v1/snapshot
 *   Header: x-api-key: mw_live_xxx
 *   (hoặc Authorization: Bearer mw_live_xxx, hoặc ?api_key=)
 *
 * Có thể lọc nhóm: ?scopes=gold,crypto
 */

const SCOPE_ALL = ["gold", "crypto", "fuel", "stocks"] as const;
type Scope = (typeof SCOPE_ALL)[number];

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

export const Route = createFileRoute("/api/public/v1/snapshot")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const auth = await verifyApiKey(request);
        if (!auth) return unauthorized();

        const url = new URL(request.url);
        const requested = (url.searchParams.get("scopes") ?? "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean) as Scope[];
        const allowed = new Set(auth.scopes);
        const wanted = (requested.length ? requested : [...SCOPE_ALL]).filter(
          (s): s is Scope => (SCOPE_ALL as readonly string[]).includes(s) && allowed.has(s),
        );

        const origin = `${url.protocol}//${url.host}`;
        const entries = await Promise.all(
          wanted.map(async (s) => [s, await fetchScope(origin, s)] as const),
        );
        const data = Object.fromEntries(entries) as Record<Scope, unknown>;

        return new Response(
          JSON.stringify({ ok: true, generatedAt: Date.now(), scopes: wanted, data }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              ...CORS_HEADERS,
            },
          },
        );
      },
    },
  },
});