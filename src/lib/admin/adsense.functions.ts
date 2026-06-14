import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/admin/middleware.server";
import {
  isAdsenseConfigured,
  listAccounts,
  getDefaultAccountName,
  generateReport,
  AdsenseNotConfiguredError,
  type AdsenseReportResponse,
} from "@/lib/admin/adsense.server";

export interface AdsenseKpis {
  earnings: number;
  impressions: number;
  clicks: number;
  pageViews: number;
  rpm: number;
  ctr: number;
  currency: string;
}

export interface AdsenseDailyRow {
  date: string;
  earnings: number;
  impressions: number;
  clicks: number;
}

export interface AdsenseBreakdownRow {
  label: string;
  earnings: number;
  impressions: number;
  clicks: number;
  rpm: number;
  ctr: number;
}

export interface AdsenseReportPayload {
  configured: boolean;
  account?: { name: string; displayName: string };
  rangeDays: number;
  currency: string;
  kpis: AdsenseKpis;
  daily: AdsenseDailyRow[];
  byAdUnit: AdsenseBreakdownRow[];
  byUrl: AdsenseBreakdownRow[];
  error?: string;
}

function num(s: string | undefined): number {
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function mapKpis(r: AdsenseReportResponse): AdsenseKpis {
  const headers = r.headers ?? [];
  const idx = (name: string) => headers.findIndex((h) => h.name === name);
  const totals = r.totals?.cells ?? [];
  const currency = headers.find((h) => h.currencyCode)?.currencyCode ?? "USD";
  const get = (name: string) => {
    const i = idx(name);
    return i >= 0 ? num(totals[i]?.value) : 0;
  };
  return {
    earnings: get("ESTIMATED_EARNINGS"),
    impressions: get("IMPRESSIONS"),
    clicks: get("CLICKS"),
    pageViews: get("PAGE_VIEWS"),
    rpm: get("IMPRESSIONS_RPM"),
    ctr: get("IMPRESSIONS_CTR"),
    currency,
  };
}

function mapDaily(r: AdsenseReportResponse): AdsenseDailyRow[] {
  const headers = r.headers ?? [];
  const idx = (name: string) => headers.findIndex((h) => h.name === name);
  const iDate = idx("DATE");
  const iEarn = idx("ESTIMATED_EARNINGS");
  const iImp = idx("IMPRESSIONS");
  const iClick = idx("CLICKS");
  return (r.rows ?? []).map((row) => ({
    date: row.cells[iDate]?.value ?? "",
    earnings: num(row.cells[iEarn]?.value),
    impressions: num(row.cells[iImp]?.value),
    clicks: num(row.cells[iClick]?.value),
  }));
}

function mapBreakdown(r: AdsenseReportResponse, dimension: string): AdsenseBreakdownRow[] {
  const headers = r.headers ?? [];
  const idx = (name: string) => headers.findIndex((h) => h.name === name);
  const iLabel = idx(dimension);
  const iEarn = idx("ESTIMATED_EARNINGS");
  const iImp = idx("IMPRESSIONS");
  const iClick = idx("CLICKS");
  const iRpm = idx("IMPRESSIONS_RPM");
  const iCtr = idx("IMPRESSIONS_CTR");
  return (r.rows ?? []).map((row) => ({
    label: row.cells[iLabel]?.value ?? "—",
    earnings: num(row.cells[iEarn]?.value),
    impressions: num(row.cells[iImp]?.value),
    clicks: num(row.cells[iClick]?.value),
    rpm: num(row.cells[iRpm]?.value),
    ctr: num(row.cells[iCtr]?.value),
  }));
}

export const getAdsenseReport = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { rangeDays?: number }) => ({
    rangeDays: Math.min(Math.max(input?.rangeDays ?? 30, 1), 90),
  }))
  .handler(async ({ data }): Promise<AdsenseReportPayload> => {
    const rangeDays = data.rangeDays;
    const empty: AdsenseReportPayload = {
      configured: isAdsenseConfigured(),
      rangeDays,
      currency: "USD",
      kpis: { earnings: 0, impressions: 0, clicks: 0, pageViews: 0, rpm: 0, ctr: 0, currency: "USD" },
      daily: [],
      byAdUnit: [],
      byUrl: [],
    };
    if (!isAdsenseConfigured()) {
      return { ...empty, error: "AdSense chưa được cấu hình. Thêm 3 secrets GOOGLE_ADSENSE_*." };
    }
    try {
      const accountName = await getDefaultAccountName();
      const accounts = await listAccounts();
      const account = accounts.find((a) => a.name === accountName);

      const end = new Date();
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - (rangeDays - 1));

      const [overview, daily, byAdUnit, byUrl] = await Promise.all([
        generateReport({ accountName, startDate: start, endDate: end }),
        generateReport({
          accountName,
          startDate: start,
          endDate: end,
          dimensions: ["DATE"],
          metrics: ["ESTIMATED_EARNINGS", "IMPRESSIONS", "CLICKS"],
          orderBy: ["+DATE"],
        }),
        generateReport({
          accountName,
          startDate: start,
          endDate: end,
          dimensions: ["AD_UNIT_NAME"],
          metrics: ["ESTIMATED_EARNINGS", "IMPRESSIONS", "CLICKS", "IMPRESSIONS_RPM", "IMPRESSIONS_CTR"],
          orderBy: ["-ESTIMATED_EARNINGS"],
          limit: 20,
        }),
        generateReport({
          accountName,
          startDate: start,
          endDate: end,
          dimensions: ["PAGE_URL"],
          metrics: ["ESTIMATED_EARNINGS", "IMPRESSIONS", "CLICKS", "IMPRESSIONS_RPM", "IMPRESSIONS_CTR"],
          orderBy: ["-ESTIMATED_EARNINGS"],
          limit: 20,
        }),
      ]);

      const kpis = mapKpis(overview);
      return {
        configured: true,
        account: account ? { name: account.name, displayName: account.displayName } : undefined,
        rangeDays,
        currency: kpis.currency,
        kpis,
        daily: mapDaily(daily),
        byAdUnit: mapBreakdown(byAdUnit, "AD_UNIT_NAME"),
        byUrl: mapBreakdown(byUrl, "PAGE_URL"),
      };
    } catch (e) {
      if (e instanceof AdsenseNotConfiguredError) {
        return { ...empty, error: e.message };
      }
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      return { ...empty, error: msg };
    }
  });