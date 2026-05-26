export type AlertDirection = "above" | "below";

export interface PriceAlert {
  id: string;
  symbol: string; // uppercase, e.g. "BTC"
  name?: string;
  direction: AlertDirection;
  threshold: number; // in USD
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  triggeredPrice?: number;
}

const KEY = "mw_price_alerts_v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadAlerts(): PriceAlert[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((a) => a && typeof a.id === "string");
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: PriceAlert[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(alerts));
  } catch { /* ignore */ }
}

export function createAlert(input: Omit<PriceAlert, "id" | "createdAt" | "triggered">): PriceAlert {
  return {
    ...input,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    triggered: false,
  };
}

export function shouldTrigger(alert: PriceAlert, priceUsd: number): boolean {
  if (alert.triggered) return false;
  if (!Number.isFinite(priceUsd)) return false;
  return alert.direction === "above" ? priceUsd >= alert.threshold : priceUsd <= alert.threshold;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function sendBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: title });
  } catch { /* ignore */ }
}