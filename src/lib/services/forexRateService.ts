import type { ForexRate } from "./types";

const BASE: Omit<ForexRate, "changePct" | "updatedAt">[] = [
  { code: "USD", name: "Đô la Mỹ",        buy: 25_280, sell: 25_520, mid: 25_400 },
  { code: "CNY", name: "Nhân dân tệ",     buy: 3_480,  sell: 3_580,  mid: 3_530 },
  { code: "JPY", name: "Yên Nhật",        buy: 162,    sell: 171,    mid: 167 },
  { code: "EUR", name: "Euro",            buy: 27_120, sell: 27_840, mid: 27_480 },
  { code: "GBP", name: "Bảng Anh",        buy: 31_640, sell: 32_540, mid: 32_090 },
  { code: "KRW", name: "Won Hàn Quốc",    buy: 16.9,   sell: 18.7,   mid: 17.8 },
  { code: "SGD", name: "Đô la Singapore", buy: 18_640, sell: 19_180, mid: 18_910 },
  { code: "THB", name: "Baht Thái",       buy: 712,    sell: 758,    mid: 735 },
  { code: "AUD", name: "Đô la Úc",        buy: 16_240, sell: 16_720, mid: 16_480 },
  { code: "CAD", name: "Đô la Canada",    buy: 17_980, sell: 18_510, mid: 18_245 },
  { code: "CHF", name: "Franc Thuỵ Sĩ",   buy: 28_540, sell: 29_320, mid: 28_930 },
];

const state = new Map<string, { mid: number; prevMid: number }>();

export async function fetchForexRates(): Promise<ForexRate[]> {
  // Try ExchangeRate-API (no key public endpoint)
  let rates: Record<string, number> | null = null;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const j = await res.json();
      if (j?.rates) {
        // Build VND-per-unit by combining USD->X with USD->VND
        const usdVnd = j.rates.VND;
        rates = {};
        for (const r of BASE) {
          if (r.code === "USD") rates[r.code] = usdVnd;
          else if (j.rates[r.code]) rates[r.code] = usdVnd / j.rates[r.code];
        }
      }
    }
  } catch {
    // ignore — fall back to mock
  }

  const now = Date.now();
  return BASE.map((r) => {
    const realMid = rates?.[r.code];
    const prev = state.get(r.code);
    const baseMid = realMid ?? r.mid;
    const jitter = baseMid * ((Math.random() - 0.5) * 0.001);
    const mid = (prev?.mid ?? baseMid) * 0.4 + (baseMid + jitter) * 0.6;
    const prevMid = prev?.prevMid ?? baseMid;
    const changePct = ((mid - prevMid) / prevMid) * 100;
    state.set(r.code, { mid, prevMid: prev ? prev.prevMid : baseMid });
    if (Math.random() < 0.1) state.get(r.code)!.prevMid = mid;
    const spread = (r.sell - r.buy) / r.mid;
    const buy = mid * (1 - spread / 2);
    const sell = mid * (1 + spread / 2);
    return { code: r.code, name: r.name, buy, sell, mid, changePct, updatedAt: now };
  });
}

export async function fetchUsdVnd(): Promise<number> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    if (r.ok) {
      const j = await r.json();
      if (j?.rates?.VND) return j.rates.VND;
    }
  } catch {}
  return 25_400;
}