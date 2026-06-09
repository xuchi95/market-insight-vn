/**
 * Client-side analytics tracker.
 *
 * Mục tiêu: thu thập sự kiện ẩn danh (ads, pageview, scroll, dwell, click,
 * funnel) để admin dashboard phân tích. Tuân thủ:
 *  - Chỉ chạy khi user đã đồng ý cookie "Phân tích".
 *  - Tôn trọng Do Not Track (`navigator.doNotTrack === "1"`).
 *  - Không lưu PII; route bị strip query string trừ whitelist.
 *  - Queue + flush qua `navigator.sendBeacon` để không chặn navigation.
 */

import { getCookieConsent } from "@/hooks/useCookieConsent";

export type AnalyticsEventType =
  | "ad_view"
  | "ad_render"
  | "ad_request"
  | "ad_click"
  | "pageview"
  | "scroll"
  | "dwell"
  | "click_outbound"
  | "click_cta"
  | "funnel_step";

export interface AnalyticsEvent {
  event_type: AnalyticsEventType;
  ts?: number;
  session_id?: string;
  anon_id?: string;
  route?: string;
  referrer_host?: string;
  placement?: string;
  ad_slot?: string;
  format?: string;
  target?: string;
  value?: number;
  meta?: Record<string, unknown>;
}

const ENDPOINT = "/api/public/analytics/ingest";
const SESSION_KEY = "mw_an_sid";
const ANON_KEY = "mw_an_aid";
const ANON_TTL_MS = 24 * 60 * 60 * 1000;
const FLUSH_INTERVAL_MS = 5000;
const MAX_QUEUE = 30;

// Whitelist các query param sẽ giữ trong `route` (giúp phân biệt ngữ cảnh
// trang nhưng không lộ search nhạy cảm).
const ROUTE_QUERY_ALLOW = new Set(["symbol", "tab", "pair", "metric"]);

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let listenersBound = false;

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return false;
  return getCookieConsent().analytics === true;
}

function randomId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${rand.slice(0, 16)}`;
}

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "";
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = randomId("s");
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getAnonId(): string {
  if (typeof localStorage === "undefined") return "";
  const raw = localStorage.getItem(ANON_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { id: string; at: number };
      if (Date.now() - parsed.at < ANON_TTL_MS) return parsed.id;
    } catch {
      /* fall-through */
    }
  }
  const id = randomId("a");
  try {
    localStorage.setItem(ANON_KEY, JSON.stringify({ id, at: Date.now() }));
  } catch {
    /* ignore quota */
  }
  return id;
}

export function getCurrentRoute(): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  const sp = new URLSearchParams();
  url.searchParams.forEach((v, k) => {
    if (ROUTE_QUERY_ALLOW.has(k)) sp.set(k, v.slice(0, 64));
  });
  const qs = sp.toString();
  return url.pathname + (qs ? `?${qs}` : "");
}

function getReferrerHost(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const ref = document.referrer;
  if (!ref) return undefined;
  try {
    const host = new URL(ref).host;
    if (host === window.location.host) return undefined;
    return host.slice(0, 255);
  } catch {
    return undefined;
  }
}

function flush(useBeacon = false): void {
  if (queue.length === 0) return;
  const events = queue;
  queue = [];
  const payload = JSON.stringify({ events });

  if (useBeacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    } catch {
      /* fall-through */
    }
  }

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

function ensureListeners(): void {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  flushTimer = setInterval(() => flush(false), FLUSH_INTERVAL_MS);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
  window.addEventListener("beforeunload", () => flush(true));
  // Khi user thu hồi consent → drop queue, không bắn thêm.
  window.addEventListener("mw:cookie-consent", () => {
    if (!isEnabled()) {
      queue = [];
      if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
        listenersBound = false;
      }
    }
  });
}

function enqueue(ev: AnalyticsEvent): void {
  if (!isEnabled()) return;
  ensureListeners();
  const enriched: AnalyticsEvent = {
    ts: Date.now(),
    session_id: getSessionId(),
    anon_id: getAnonId(),
    route: ev.route ?? getCurrentRoute(),
    referrer_host: ev.referrer_host ?? getReferrerHost(),
    ...ev,
  };
  queue.push(enriched);
  if (queue.length >= MAX_QUEUE) flush(false);
}

/* ============ Public API ============ */

export function trackPageview(route?: string): void {
  enqueue({ event_type: "pageview", route });
}

export function trackScroll(percent: number): void {
  enqueue({ event_type: "scroll", value: Math.round(percent) });
}

export function trackDwell(seconds: number): void {
  enqueue({ event_type: "dwell", value: Math.round(seconds) });
}

export function trackOutbound(target: string): void {
  enqueue({ event_type: "click_outbound", target: target.slice(0, 255) });
}

export function trackCta(name: string, meta?: Record<string, unknown>): void {
  enqueue({ event_type: "click_cta", target: name.slice(0, 255), meta });
}

export function trackFunnel(step: string, meta?: Record<string, unknown>): void {
  enqueue({ event_type: "funnel_step", target: step.slice(0, 255), meta });
}

export function trackAd(
  type: "ad_view" | "ad_render" | "ad_request" | "ad_click",
  payload: { slot?: string; placement?: string; format?: string },
): void {
  enqueue({
    event_type: type,
    ad_slot: payload.slot,
    placement: payload.placement,
    format: payload.format,
  });
}