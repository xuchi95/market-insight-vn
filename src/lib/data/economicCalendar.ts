export type EconImpact = "low" | "medium" | "high";
export type EconAffects = "gold" | "usd" | "btc" | "stocks" | "vnd";

export interface EconomicEvent {
  id: string;
  /** ISO datetime UTC */
  datetime: string;
  country: string;       // ISO-2, e.g. US, EU, JP, VN, CN, GB
  countryName: string;   // Hiển thị
  event: string;         // Tên sự kiện
  impact: EconImpact;
  previous?: string;
  forecast?: string;
  actual?: string;
  affects: EconAffects[];
  note?: string;
}

// Lịch kinh tế tham khảo — cập nhật thủ công định kỳ.
// Thời gian dùng UTC. Các sự kiện định kỳ hàng tháng/quý của Fed, ECB, BLS, BoJ...
export const ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    id: "us-cpi-2026-06",
    datetime: "2026-06-11T12:30:00Z",
    country: "US", countryName: "Hoa Kỳ",
    event: "Chỉ số giá tiêu dùng CPI (YoY)",
    impact: "high",
    previous: "2.4%", forecast: "2.3%",
    affects: ["gold", "usd", "btc", "stocks"],
    note: "Dữ liệu lạm phát quan trọng nhất ảnh hưởng quyết định lãi suất Fed.",
  },
  {
    id: "us-fomc-2026-06",
    datetime: "2026-06-17T18:00:00Z",
    country: "US", countryName: "Hoa Kỳ",
    event: "Quyết định lãi suất FOMC (Fed)",
    impact: "high",
    previous: "4.50%", forecast: "4.25%",
    affects: ["gold", "usd", "btc", "stocks"],
  },
  {
    id: "us-nfp-2026-06",
    datetime: "2026-06-05T12:30:00Z",
    country: "US", countryName: "Hoa Kỳ",
    event: "Bảng lương phi nông nghiệp NFP",
    impact: "high",
    previous: "180K", forecast: "170K",
    affects: ["usd", "gold", "stocks"],
  },
  {
    id: "us-ppi-2026-06",
    datetime: "2026-06-12T12:30:00Z",
    country: "US", countryName: "Hoa Kỳ",
    event: "Chỉ số giá sản xuất PPI",
    impact: "medium",
    previous: "2.6%", forecast: "2.5%",
    affects: ["usd", "gold"],
  },
  {
    id: "us-retail-2026-06",
    datetime: "2026-06-17T12:30:00Z",
    country: "US", countryName: "Hoa Kỳ",
    event: "Doanh số bán lẻ (MoM)",
    impact: "medium",
    previous: "0.4%", forecast: "0.3%",
    affects: ["usd", "stocks"],
  },
  {
    id: "eu-ecb-2026-06",
    datetime: "2026-06-04T12:15:00Z",
    country: "EU", countryName: "Eurozone",
    event: "Quyết định lãi suất ECB",
    impact: "high",
    previous: "2.50%", forecast: "2.25%",
    affects: ["usd", "gold"],
  },
  {
    id: "eu-cpi-2026-06",
    datetime: "2026-06-18T09:00:00Z",
    country: "EU", countryName: "Eurozone",
    event: "CPI khu vực Eurozone (YoY)",
    impact: "medium",
    previous: "2.1%", forecast: "2.0%",
    affects: ["usd"],
  },
  {
    id: "jp-boj-2026-06",
    datetime: "2026-06-19T03:00:00Z",
    country: "JP", countryName: "Nhật Bản",
    event: "Quyết định chính sách tiền tệ BoJ",
    impact: "high",
    previous: "0.50%", forecast: "0.50%",
    affects: ["usd", "gold"],
  },
  {
    id: "cn-gdp-2026-q2",
    datetime: "2026-07-15T02:00:00Z",
    country: "CN", countryName: "Trung Quốc",
    event: "GDP Q2 (YoY)",
    impact: "high",
    previous: "5.0%", forecast: "4.8%",
    affects: ["stocks", "gold"],
  },
  {
    id: "cn-cpi-2026-06",
    datetime: "2026-06-09T01:30:00Z",
    country: "CN", countryName: "Trung Quốc",
    event: "CPI Trung Quốc (YoY)",
    impact: "medium",
    previous: "0.3%", forecast: "0.4%",
    affects: ["stocks"],
  },
  {
    id: "gb-boe-2026-06",
    datetime: "2026-06-18T11:00:00Z",
    country: "GB", countryName: "Anh Quốc",
    event: "Quyết định lãi suất BoE",
    impact: "high",
    previous: "4.25%", forecast: "4.00%",
    affects: ["usd", "gold"],
  },
  {
    id: "vn-cpi-2026-06",
    datetime: "2026-06-29T01:00:00Z",
    country: "VN", countryName: "Việt Nam",
    event: "CPI Việt Nam tháng 6 (YoY)",
    impact: "medium",
    previous: "3.2%", forecast: "3.3%",
    affects: ["vnd", "stocks"],
  },
  {
    id: "vn-gdp-2026-q2",
    datetime: "2026-06-29T01:00:00Z",
    country: "VN", countryName: "Việt Nam",
    event: "GDP Việt Nam Q2 (YoY)",
    impact: "high",
    previous: "6.9%", forecast: "7.0%",
    affects: ["vnd", "stocks"],
  },
  {
    id: "us-cpi-2026-07",
    datetime: "2026-07-15T12:30:00Z",
    country: "US", countryName: "Hoa Kỳ",
    event: "Chỉ số giá tiêu dùng CPI (YoY)",
    impact: "high",
    previous: "2.3%", forecast: "2.2%",
    affects: ["gold", "usd", "btc", "stocks"],
  },
  {
    id: "us-fomc-2026-07",
    datetime: "2026-07-29T18:00:00Z",
    country: "US", countryName: "Hoa Kỳ",
    event: "Quyết định lãi suất FOMC (Fed)",
    impact: "high",
    previous: "4.25%", forecast: "4.00%",
    affects: ["gold", "usd", "btc", "stocks"],
  },
  {
    id: "us-nfp-2026-07",
    datetime: "2026-07-02T12:30:00Z",
    country: "US", countryName: "Hoa Kỳ",
    event: "Bảng lương phi nông nghiệp NFP",
    impact: "high",
    previous: "170K", forecast: "165K",
    affects: ["usd", "gold", "stocks"],
  },
];

export function flagEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "🌐";
  if (iso2 === "EU") return "🇪🇺";
  const base = 0x1f1e6;
  return String.fromCodePoint(...iso2.toUpperCase().split("").map((c) => base + (c.charCodeAt(0) - 65)));
}