/**
 * Google AdSense Management API (v2) helpers — server-only.
 *
 * Auth: OAuth2 refresh-token flow. Đòi 3 env vars:
 *   - GOOGLE_ADSENSE_CLIENT_ID
 *   - GOOGLE_ADSENSE_CLIENT_SECRET
 *   - GOOGLE_ADSENSE_REFRESH_TOKEN
 *
 * API docs: https://developers.google.com/adsense/management/reference/rest
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://adsense.googleapis.com/v2";

// In-memory access-token cache (per worker isolate).
let cached: { token: string; expiresAt: number } | null = null;

export class AdsenseNotConfiguredError extends Error {
  constructor() {
    super("AdSense secrets chưa được cấu hình");
    this.name = "AdsenseNotConfiguredError";
  }
}

export function isAdsenseConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_ADSENSE_CLIENT_ID &&
      process.env.GOOGLE_ADSENSE_CLIENT_SECRET &&
      process.env.GOOGLE_ADSENSE_REFRESH_TOKEN,
  );
}

async function getAccessToken(): Promise<string> {
  if (!isAdsenseConfigured()) throw new AdsenseNotConfiguredError();
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_ADSENSE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADSENSE_CLIENT_SECRET!,
    refresh_token: process.env.GOOGLE_ADSENSE_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AdSense token refresh thất bại: ${res.status} ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

async function apiGet<T>(path: string, query?: Record<string, string | string[]>): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, vv));
      else url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AdSense API ${path} thất bại: ${res.status} ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export interface AdsenseAccount {
  name: string; // "accounts/pub-1234567890123456"
  displayName: string;
  timeZone?: { id: string };
  createTime?: string;
}

export async function listAccounts(): Promise<AdsenseAccount[]> {
  const res = await apiGet<{ accounts?: AdsenseAccount[] }>("/accounts");
  return res.accounts ?? [];
}

export async function getDefaultAccountName(): Promise<string> {
  const accounts = await listAccounts();
  if (!accounts.length) throw new Error("AdSense: chưa có account nào được liên kết");
  return accounts[0].name;
}

/**
 * Reports.generate — trả về header + matrix rows.
 * Doc: https://developers.google.com/adsense/management/reference/rest/v2/accounts.reports/generate
 */
export interface AdsenseReportResponse {
  headers?: { name: string; type: string; currencyCode?: string }[];
  rows?: { cells: { value?: string }[] }[];
  totals?: { cells: { value?: string }[] };
  averages?: { cells: { value?: string }[] };
  startDate?: { year: number; month: number; day: number };
  endDate?: { year: number; month: number; day: number };
}

function ymd(d: Date): { year: string; month: string; day: string } {
  return {
    year: String(d.getUTCFullYear()),
    month: String(d.getUTCMonth() + 1),
    day: String(d.getUTCDate()),
  };
}

export async function generateReport(opts: {
  accountName: string;
  startDate: Date;
  endDate: Date;
  dimensions?: string[];
  metrics?: string[];
  orderBy?: string[];
  limit?: number;
}): Promise<AdsenseReportResponse> {
  const start = ymd(opts.startDate);
  const end = ymd(opts.endDate);
  const query: Record<string, string | string[]> = {
    "startDate.year": start.year,
    "startDate.month": start.month,
    "startDate.day": start.day,
    "endDate.year": end.year,
    "endDate.month": end.month,
    "endDate.day": end.day,
    metrics: opts.metrics ?? [
      "ESTIMATED_EARNINGS",
      "IMPRESSIONS",
      "CLICKS",
      "IMPRESSIONS_RPM",
      "IMPRESSIONS_CTR",
      "PAGE_VIEWS",
    ],
  };
  if (opts.dimensions?.length) query.dimensions = opts.dimensions;
  if (opts.orderBy?.length) query.orderBy = opts.orderBy;
  if (opts.limit) query.limit = String(opts.limit);
  return apiGet<AdsenseReportResponse>(`/${opts.accountName}/reports:generate`, query);
}