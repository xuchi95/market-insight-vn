// Helpers cho API key của bên thứ ba (xác thực + sinh key).
// Service_role only — không bao giờ import từ client.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface ApiKeyRecord {
  id: string;
  name: string;
  scopes: string[];
  owner_email: string | null;
}

/** SHA-256 hex (Web Crypto — chạy được trên Workers). */
export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Sinh API key dạng `mw_live_<32 hex>`. Prefix dùng để hiển thị trong admin. */
export async function generateApiKey(): Promise<{ key: string; prefix: string; hash: string }> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `mw_live_${body}`;
  return { key, prefix: key.slice(0, 12), hash: await sha256Hex(key) };
}

/**
 * Đọc API key từ request (header `x-api-key`, `Authorization: Bearer ...`,
 * hoặc query `?api_key=`) → trả record nếu hợp lệ, ngược lại `null`.
 * Cập nhật `last_used_at` + `request_count` fire-and-forget.
 */
export async function verifyApiKey(request: Request): Promise<ApiKeyRecord | null> {
  const url = new URL(request.url);
  const fromHeader = request.headers.get("x-api-key");
  const auth = request.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  const fromQuery = url.searchParams.get("api_key");
  const raw = fromHeader || bearer || fromQuery;
  if (!raw) return null;
  const hash = await sha256Hex(raw.trim());
  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, scopes, owner_email, active")
    .eq("key_hash", hash)
    .maybeSingle();
  if (!data || !data.active) return null;
  // Fire-and-forget usage tracking.
  void supabaseAdmin.rpc as never; // noop reference to keep tree-shake stable
  void supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString(), request_count: (await currentCount(data.id)) + 1 })
    .eq("id", data.id)
    .then(() => undefined, () => undefined);
  return {
    id: data.id as string,
    name: data.name as string,
    scopes: (data.scopes as string[]) ?? [],
    owner_email: (data.owner_email as string | null) ?? null,
  };
}

async function currentCount(id: string): Promise<number> {
  try {
    const { data } = await supabaseAdmin
      .from("api_keys")
      .select("request_count")
      .eq("id", id)
      .maybeSingle();
    return Number(data?.request_count ?? 0);
  } catch {
    return 0;
  }
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
  "Access-Control-Max-Age": "86400",
} as const;

export function unauthorized(message = "Invalid or missing API key"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}