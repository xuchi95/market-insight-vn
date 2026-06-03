import { createClient } from "@supabase/supabase-js";

/**
 * Guard cho các endpoint REST trong `src/routes/api/public/*` cần đăng nhập.
 *
 * - Cho phép request từ chính server (SSR / sitemap / cron) thông qua header
 *   `x-internal-key` bằng `SUPABASE_SERVICE_ROLE_KEY` — header này không bao
 *   giờ rời khỏi Worker nên client không thể giả mạo.
 * - Với request thường, yêu cầu `Authorization: Bearer <access_token>` hợp lệ
 *   (validate qua `supabase.auth.getClaims`).
 * - Trả về `Response` 401 JSON khi không hợp lệ, hoặc `null` khi cho qua.
 */
export async function requireRequestUser(
  request: Request | undefined,
): Promise<Response | null> {
  const internalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (request && internalKey) {
    const hdr = request.headers.get("x-internal-key");
    if (hdr && hdr === internalKey) return null;
  }

  const auth = request?.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return unauthorized();
  const token = auth.slice(7).trim();
  if (!token) return unauthorized();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return unauthorized();

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getClaims(token);
    if (error || !data?.claims?.sub) return unauthorized();
    return null;
  } catch {
    return unauthorized();
  }
}

function unauthorized(): Response {
  return new Response(
    JSON.stringify({
      error: "auth_required",
      message:
        "Vui lòng đăng nhập để xem dữ liệu realtime nâng cao của MarketWatch.",
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}