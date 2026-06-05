import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE = "https://marketwatch.vn";

export const PREDICTABLE_ASSETS = [
  { slug: "gold-sjc", label: "Vàng SJC", category: "Kim loại quý", unit: "VND/lượng" },
  { slug: "gold-ring", label: "Vàng nhẫn 9999", category: "Kim loại quý", unit: "VND/lượng" },
  { slug: "xau-usd", label: "Vàng thế giới (XAU/USD)", category: "Kim loại quý", unit: "USD/oz" },
  { slug: "silver", label: "Bạc (XAG/USD)", category: "Kim loại quý", unit: "USD/oz" },
  { slug: "platinum", label: "Bạch kim (XPT/USD)", category: "Kim loại quý", unit: "USD/oz" },
  { slug: "oil-brent", label: "Dầu Brent", category: "Năng lượng", unit: "USD/thùng" },
  { slug: "oil-wti", label: "Dầu WTI", category: "Năng lượng", unit: "USD/thùng" },
  { slug: "fuel-ron95", label: "Xăng RON 95-III (VN)", category: "Năng lượng", unit: "VND/lít" },
  { slug: "fuel-e5", label: "Xăng E5 RON 92-II (VN)", category: "Năng lượng", unit: "VND/lít" },
  { slug: "fuel-diesel", label: "Dầu Diesel 0,05S-II (VN)", category: "Năng lượng", unit: "VND/lít" },
  { slug: "btc", label: "Bitcoin (BTC)", category: "Tiền điện tử", unit: "USD" },
  { slug: "eth", label: "Ethereum (ETH)", category: "Tiền điện tử", unit: "USD" },
  { slug: "sol", label: "Solana (SOL)", category: "Tiền điện tử", unit: "USD" },
  { slug: "bnb", label: "BNB", category: "Tiền điện tử", unit: "USD" },
  { slug: "xrp", label: "XRP", category: "Tiền điện tử", unit: "USD" },
  { slug: "usd-vnd", label: "Tỷ giá USD/VND", category: "Ngoại tệ", unit: "VND" },
  { slug: "eur-vnd", label: "Tỷ giá EUR/VND", category: "Ngoại tệ", unit: "VND" },
  { slug: "jpy-vnd", label: "Tỷ giá JPY/VND", category: "Ngoại tệ", unit: "VND" },
] as const;

export type AssetSlug = (typeof PREDICTABLE_ASSETS)[number]["slug"];

export const HORIZONS = [
  { value: "24h", label: "24 giờ tới" },
  { value: "7d", label: "7 ngày tới" },
  { value: "30d", label: "30 ngày tới" },
] as const;

type Horizon = (typeof HORIZONS)[number]["value"];

export const OPENROUTER_MODELS = [
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Cân bằng tốc độ & chất lượng (mặc định, rẻ).",
    badge: "Mặc định",
  },
  {
    id: "deepseek/deepseek-chat",
    label: "DeepSeek Chat",
    description: "Rất rẻ (~1/10 OpenAI), chất lượng phân tích tốt.",
    badge: "Tiết kiệm",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    description: "Mô hình mã nguồn mở của Meta, giá rẻ.",
    badge: "Mở",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B (Free)",
    description: "Miễn phí — có giới hạn tốc độ, có thể không hỗ trợ JSON schema.",
    badge: "Miễn phí",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o mini",
    description: "Chỉ chạy được khi cấu hình proxy/endpoint vùng US hoặc EU.",
    badge: "Cần proxy",
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    description: "Chỉ chạy được khi cấu hình proxy/endpoint vùng US hoặc EU.",
    badge: "Cần proxy",
  },
  {
    id: "anthropic/claude-3.5-haiku",
    label: "Claude 3.5 Haiku",
    description: "Chỉ chạy được khi cấu hình proxy/endpoint vùng US hoặc EU.",
    badge: "Cần proxy",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    description: "Chỉ chạy được khi cấu hình proxy/endpoint vùng US hoặc EU.",
    badge: "Cần proxy",
  },
] as const;

export type OpenRouterModelId = (typeof OPENROUTER_MODELS)[number]["id"];
const MODEL_IDS = OPENROUTER_MODELS.map((m) => m.id) as [OpenRouterModelId, ...OpenRouterModelId[]];
export const DEFAULT_MODEL: OpenRouterModelId = "google/gemini-2.5-flash";
export const DEFAULT_API_BASE_URL = "https://openrouter.ai/api/v1";

// Vùng bị OpenAI/Anthropic chặn (qua OpenRouter) — hay gặp nhất.
const RESTRICTED_REGIONS = new Set([
  "VN", "CN", "HK", "RU", "IR", "KP", "CU", "SY", "BY", "MM",
]);
const REGION_RESTRICTED_PROVIDERS = ["openai/", "anthropic/"];

async function detectRegionFromCloudflare(): Promise<string | null> {
  // Ưu tiên header CF gắn sẵn ở edge (cf-ipcountry / x-vercel-ip-country).
  try {
    const h =
      getRequestHeader("cf-ipcountry") ??
      getRequestHeader("x-vercel-ip-country") ??
      getRequestHeader("x-country-code");
    if (h && h !== "XX" && h !== "T1") return h.toUpperCase();
  } catch {}
  // Fallback: hỏi Cloudflare trace từ chính server.
  try {
    const r = await fetch("https://cloudflare.com/cdn-cgi/trace", {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    const txt = await r.text();
    const m = txt.match(/^loc=([A-Z]{2})/m);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function modelNeedsProxyForRegion(modelId: string, region: string | null): boolean {
  if (!region) return false;
  if (!RESTRICTED_REGIONS.has(region)) return false;
  return REGION_RESTRICTED_PROVIDERS.some((p) => modelId.startsWith(p));
}

export const detectAiRegion = createServerFn({ method: "GET" }).handler(async () => {
  const region = await detectRegionFromCloudflare();
  const { data: settings } = await supabaseAdmin
    .from("app_ai_settings")
    .select("predict_model, api_base_url")
    .eq("id", 1)
    .maybeSingle();
  const model = (settings?.predict_model as string | undefined) ?? DEFAULT_MODEL;
  const hasProxy = !!(settings?.api_base_url as string | undefined)?.trim();
  const needsProxy = modelNeedsProxyForRegion(model, region);
  return {
    region,
    region_blocked_providers: Array.from(RESTRICTED_REGIONS),
    current_model: model,
    has_custom_proxy: hasProxy,
    needs_proxy_for_current_model: needsProxy,
    suggestion: needsProxy && !hasProxy
      ? `Máy chủ đang ở khu vực ${region} — mô hình ${model} có khả năng cao bị OpenRouter chặn (403). Hãy cấu hình proxy US/EU OpenAI-compatible, hoặc đổi sang Gemini/DeepSeek/Llama.`
      : null,
  };
});

const InputSchema = z.object({
  asset: z.enum(PREDICTABLE_ASSETS.map((a) => a.slug) as [AssetSlug, ...AssetSlug[]]),
  horizon: z.enum(["24h", "7d", "30d"]),
});

interface PriceContext {
  current: string;
  notes: string[];
}

async function safeFetchJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}
function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

async function buildContext(asset: AssetSlug): Promise<PriceContext> {
  const notes: string[] = [];
  let current = "Không có dữ liệu hiện hành.";

  if (asset === "gold-sjc" || asset === "gold-ring" || asset === "xau-usd") {
    const g = await safeFetchJson(`${SITE}/api/public/gold`);
    if (g?.items?.length) {
      const sjc = g.items.find((x: any) => /SJC/i.test(x.name));
      const ring = g.items.find((x: any) => /nhẫn|ring|9999/i.test(x.name));
      if (sjc) notes.push(`Vàng SJC hiện tại: mua ${fmtVND(sjc.buy)} – bán ${fmtVND(sjc.sell)} VND/lượng.`);
      if (ring) notes.push(`Vàng nhẫn 9999: mua ${fmtVND(ring.buy)} – bán ${fmtVND(ring.sell)} VND/lượng.`);
    }
    const m = await safeFetchJson(`${SITE}/api/public/metals`);
    if (m?.items?.length) {
      for (const it of m.items.slice(0, 3)) {
        notes.push(`${it.name}: ${fmtUSD(it.price)} USD (thay đổi 24h ${it.change_pct?.toFixed?.(2) ?? "n/a"}%).`);
      }
    }
  }
  if (asset === "silver" || asset === "platinum") {
    const m = await safeFetchJson(`${SITE}/api/public/metals`);
    if (m?.items?.length) {
      for (const it of m.items) {
        notes.push(`${it.name}: ${fmtUSD(it.price)} USD (24h ${it.change_pct?.toFixed?.(2) ?? "n/a"}%).`);
      }
    }
  }
  if (asset === "oil-brent" || asset === "oil-wti") {
    const o = await safeFetchJson(`${SITE}/api/public/oil`);
    if (o) {
      if (o.brent) notes.push(`Brent: ${fmtUSD(o.brent.price)} USD/thùng (24h ${o.brent.change_pct?.toFixed?.(2) ?? "n/a"}%).`);
      if (o.wti) notes.push(`WTI: ${fmtUSD(o.wti.price)} USD/thùng (24h ${o.wti.change_pct?.toFixed?.(2) ?? "n/a"}%).`);
    }
  }
  if (asset === "fuel-ron95" || asset === "fuel-e5" || asset === "fuel-diesel") {
    const { data } = await supabaseAdmin
      .from("vn_fuel_prices_snapshot")
      .select("effective_from, rows")
      .eq("id", "latest")
      .maybeSingle();
    if (data?.rows) {
      const rows = data.rows as Array<{ name: string; unit: string; zone1: number; zone2: number }>;
      notes.push(`Bảng giá Petrolimex hiệu lực ${data.effective_from}:`);
      for (const r of rows.slice(0, 6)) {
        notes.push(`- ${r.name}: V1 ${new Intl.NumberFormat("vi-VN").format(r.zone1)} – V2 ${new Intl.NumberFormat("vi-VN").format(r.zone2)} ${r.unit}.`);
      }
    }
    const o = await safeFetchJson(`${SITE}/api/public/oil`);
    if (o?.brent) notes.push(`Brent tham chiếu: ${fmtUSD(o.brent.price)} USD/thùng.`);
  }
  if (["btc", "eth", "sol", "bnb", "xrp"].includes(asset)) {
    const c = await safeFetchJson(`${SITE}/api/public/crypto`);
    if (c?.coins?.length) {
      const map: Record<string, string> = { btc: "BTC", eth: "ETH", sol: "SOL", bnb: "BNB", xrp: "XRP" };
      const sym = map[asset];
      const main = c.coins.find((x: any) => String(x.symbol).toUpperCase() === sym);
      if (main) notes.push(`${main.name}: ${fmtUSD(main.price_usd)} USD (24h ${main.change_24h?.toFixed?.(2) ?? "n/a"}%, vốn hóa ${fmtUSD(main.market_cap ?? 0)} USD).`);
      const others = c.coins.filter((x: any) => String(x.symbol).toUpperCase() !== sym).slice(0, 4);
      for (const it of others) {
        notes.push(`- ${it.symbol}: ${fmtUSD(it.price_usd)} USD (24h ${it.change_24h?.toFixed?.(2) ?? "n/a"}%).`);
      }
    }
    const f = await safeFetchJson(`${SITE}/api/public/fear-greed`);
    if (f?.value != null) notes.push(`Fear & Greed Index: ${f.value} (${f.classification ?? ""}).`);
  }
  if (asset === "usd-vnd" || asset === "eur-vnd" || asset === "jpy-vnd") {
    const fx = await safeFetchJson(`${SITE}/api/public/forex`);
    if (fx?.items?.length) {
      for (const it of fx.items.slice(0, 6)) {
        notes.push(`${it.code}: mua ${new Intl.NumberFormat("vi-VN").format(it.buy)} – bán ${new Intl.NumberFormat("vi-VN").format(it.sell)} VND.`);
      }
    }
  }

  if (notes.length) current = notes.join("\n");
  return { current, notes };
}

const ResponseSchema = z.object({
  direction: z.enum(["tăng", "giảm", "đi ngang"]),
  confidence: z.enum(["thấp", "trung bình", "cao"]),
  expected_change_pct_low: z.number(),
  expected_change_pct_high: z.number(),
  summary: z.string(),
  drivers: z.array(z.string()).min(2).max(6),
  risks: z.array(z.string()).min(1).max(5),
  scenarios: z.object({
    bullish: z.string(),
    base: z.string(),
    bearish: z.string(),
  }),
});

export type PredictionResult = z.infer<typeof ResponseSchema> & {
  asset: AssetSlug;
  horizon: Horizon;
  generated_at: string;
  context: string;
  model: string;
};

export const predictAssetPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<PredictionResult> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("Tính năng AI tạm thời không khả dụng (thiếu cấu hình).");

    const meta = PREDICTABLE_ASSETS.find((a) => a.slug === data.asset)!;
    const horizonLabel = HORIZONS.find((h) => h.value === data.horizon)!.label;
    const ctx = await buildContext(data.asset);
    // Mô hình AI do admin cấu hình trong dashboard — người dùng không tự chọn.
    let model: OpenRouterModelId = DEFAULT_MODEL;
    let baseUrl: string = DEFAULT_API_BASE_URL;
    let hasCustomProxy = false;
    try {
      const { data: settings } = await supabaseAdmin
        .from("app_ai_settings")
        .select("predict_model, api_base_url")
        .eq("id", 1)
        .maybeSingle();
      const saved = settings?.predict_model as OpenRouterModelId | undefined;
      if (saved && MODEL_IDS.includes(saved)) model = saved;
      const savedUrl = (settings?.api_base_url as string | undefined)?.trim();
      if (savedUrl) {
        baseUrl = savedUrl.replace(/\/+$/, "");
        hasCustomProxy = true;
      }
    } catch {
      // giữ DEFAULT_MODEL
    }

    const system = [
      "Bạn là chuyên gia phân tích thị trường tài chính nói tiếng Việt, làm việc cho MarketWatch Việt Nam.",
      "Bạn đưa ra ước lượng định hướng giá ngắn hạn DỰA TRÊN dữ liệu hiện hành được cung cấp + bối cảnh thị trường chung mà bạn biết.",
      "Tuyệt đối không khẳng định chắc chắn. Nhấn mạnh đây là ước lượng xác suất, không phải lời khuyên đầu tư.",
      "Trả lời JSON đúng schema, ngắn gọn, đúng tiếng Việt, không lặp lại JSON trong văn bản.",
    ].join(" ");

    const user = `Tài sản: ${meta.label} (${meta.category}) — đơn vị ${meta.unit}.
Khung thời gian dự báo: ${horizonLabel}.

Dữ liệu thị trường hiện hành:
${ctx.current}

Yêu cầu:
- direction: "tăng" / "giảm" / "đi ngang".
- confidence: "thấp" / "trung bình" / "cao".
- expected_change_pct_low / expected_change_pct_high: biên độ % thay đổi giá kỳ vọng (vd -2.5 đến 1.2). Phải hợp lý với khung thời gian.
- summary: 2–3 câu tổng quan tiếng Việt.
- drivers: 3–5 động lực chính (vĩ mô, cung cầu, dòng tiền, kỹ thuật).
- risks: 2–4 rủi ro có thể đảo chiều dự báo.
- scenarios: 1 câu cho mỗi kịch bản bullish / base / bearish.`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": SITE,
        "X-Title": "MarketWatch Vietnam",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "price_prediction",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "direction",
                "confidence",
                "expected_change_pct_low",
                "expected_change_pct_high",
                "summary",
                "drivers",
                "risks",
                "scenarios",
              ],
              properties: {
                direction: { type: "string", enum: ["tăng", "giảm", "đi ngang"] },
                confidence: { type: "string", enum: ["thấp", "trung bình", "cao"] },
                expected_change_pct_low: { type: "number" },
                expected_change_pct_high: { type: "number" },
                summary: { type: "string" },
                drivers: { type: "array", items: { type: "string" } },
                risks: { type: "array", items: { type: "string" } },
                scenarios: {
                  type: "object",
                  additionalProperties: false,
                  required: ["bullish", "base", "bearish"],
                  properties: {
                    bullish: { type: "string" },
                    base: { type: "string" },
                    bearish: { type: "string" },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (res.status === 429) throw new Error("Đã đạt giới hạn truy vấn AI, vui lòng thử lại sau ít phút.");
    if (res.status === 402) throw new Error("Hết hạn mức OpenRouter, vui lòng nạp thêm credit.");
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("OpenRouter error", res.status, txt);
      let detail = "";
      try {
        const j = JSON.parse(txt);
        detail = j?.error?.message ?? "";
      } catch {}
      if (res.status === 403) {
        const region = await detectRegionFromCloudflare();
        const parts: string[] = [];
        parts.push(
          `Mô hình ${model} không khả dụng ở khu vực máy chủ${region ? ` (${region})` : ""}${
            detail ? `: ${detail}` : ""
          }.`,
        );
        if (modelNeedsProxyForRegion(model, region) && !hasCustomProxy) {
          parts.push(
            "Đề xuất: vào /mw-admin/settings → mục \"Endpoint API (proxy theo khu vực)\" và đặt URL proxy OpenAI-compatible đặt ở Mỹ/EU, hoặc đổi sang Gemini 2.5 Flash / DeepSeek / Llama.",
          );
        } else if (hasCustomProxy) {
          parts.push(
            `Proxy hiện tại (${baseUrl}) cũng bị chặn — kiểm tra lại vùng đặt proxy hoặc đổi mô hình.`,
          );
        } else {
          parts.push("Hãy đổi sang mô hình khác trong /mw-admin/settings.");
        }
        throw new Error(parts.join(" "));
      }
      if (res.status === 401) {
        throw new Error("OpenRouter từ chối API key (401). Kiểm tra lại OPENROUTER_API_KEY.");
      }
      throw new Error(
        `Không kết nối được dịch vụ AI (HTTP ${res.status})${detail ? `: ${detail}` : ""}.`,
      );
    }
    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI trả về phản hồi rỗng.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Không phân tích được phản hồi AI.");
    }
    const out = ResponseSchema.parse(parsed);
    return {
      ...out,
      asset: data.asset,
      horizon: data.horizon,
      generated_at: new Date().toISOString(),
      context: ctx.current,
      model,
    };
  });