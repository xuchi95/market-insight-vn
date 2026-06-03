// Persistent cross-isolate cache for upstream price snapshots.
// Survives Worker isolate recycle so cold-starts don't pay upstream latency.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function readPriceCache<T = unknown>(
  key: string,
  maxAgeMs?: number,
): Promise<{ payload: T; updatedAt: number } | null> {
  try {
    const { data } = await supabaseAdmin
      .from("price_cache")
      .select("payload, updated_at")
      .eq("key", key)
      .maybeSingle();
    if (!data) return null;
    const ts = new Date(data.updated_at as string).getTime();
    if (maxAgeMs && Date.now() - ts > maxAgeMs) return null;
    return { payload: data.payload as T, updatedAt: ts };
  } catch {
    return null;
  }
}

// Fire-and-forget — never block the request on the write.
export function writePriceCache(key: string, payload: unknown): void {
  void supabaseAdmin
    .from("price_cache")
    .upsert(
      { key, payload: payload as never, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    )
    .then(() => undefined, () => undefined);
}