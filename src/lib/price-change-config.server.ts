import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Cấu hình runtime để tính % thay đổi giá 24h.
 * Đọc từ bảng `price_change_settings` (admin chỉnh được), cache trong RAM 60s.
 * Fallback về giá trị env / mặc định nếu DB lỗi.
 */
export interface PriceChangeConfig {
  enabled: boolean;
  windowToleranceMs: number;
  minSampleAgeMs: number;
  minSamples: number;
  snapshotMinIntervalMs: number;
}

const CACHE_TTL_MS = 60_000;
let cache: { at: number; cfg: PriceChangeConfig } | null = null;

function fromEnvDefaults(): PriceChangeConfig {
  return {
    enabled: true,
    windowToleranceMs:
      (Number(process.env.PRICE_WINDOW_TOLERANCE_HOURS) || 2) * 60 * 60 * 1000,
    minSampleAgeMs:
      (Number(process.env.PRICE_MIN_SAMPLE_AGE_HOURS) || 0) * 60 * 60 * 1000,
    minSamples: Number(process.env.PRICE_MIN_SAMPLES) || 1,
    snapshotMinIntervalMs:
      (Number(process.env.PRICE_SNAPSHOT_MIN_INTERVAL_MINUTES) || 5) * 60 * 1000,
  };
}

export async function getPriceChangeConfig(): Promise<PriceChangeConfig> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.cfg;
  try {
    const { data } = await supabaseAdmin
      .from("price_change_settings")
      .select(
        "enabled, window_tolerance_hours, min_sample_age_hours, min_samples, snapshot_min_interval_minutes",
      )
      .eq("id", 1)
      .maybeSingle();
    const cfg: PriceChangeConfig = data
      ? {
          enabled: !!data.enabled,
          windowToleranceMs: Number(data.window_tolerance_hours) * 60 * 60 * 1000,
          minSampleAgeMs: Number(data.min_sample_age_hours) * 60 * 60 * 1000,
          minSamples: Number(data.min_samples) || 1,
          snapshotMinIntervalMs:
            Number(data.snapshot_min_interval_minutes) * 60 * 1000,
        }
      : fromEnvDefaults();
    cache = { at: now, cfg };
    return cfg;
  } catch {
    const cfg = fromEnvDefaults();
    cache = { at: now, cfg };
    return cfg;
  }
}