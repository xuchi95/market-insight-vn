/**
 * Client-side helpers for the Web Push subscription flow.
 *
 * The flow:
 *  1. fetch VAPID public key from /api/public/push/vapid-public-key
 *  2. register /sw-push.js
 *  3. ask user for Notification permission
 *  4. subscribe via PushManager
 *  5. POST subscription to /api/public/push/subscribe
 */

export const PUSH_SW_URL = '/sw-push.js';

export type PushState =
  | 'unsupported'
  | 'denied'
  | 'default' // not asked yet
  | 'subscribed';

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

function bufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_URL);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) return 'subscribed';
  } catch {
    /* ignore */
  }
  return Notification.permission === 'granted' ? 'default' : 'default';
}

async function fetchVapidPublicKey(): Promise<string> {
  const r = await fetch('/api/public/push/vapid-public-key', { cache: 'no-store' });
  if (!r.ok) throw new Error('Không lấy được khóa VAPID');
  const { publicKey } = (await r.json()) as { publicKey: string };
  if (!publicKey) throw new Error('VAPID public key trống');
  return publicKey;
}

export async function subscribePush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return permission === 'denied' ? 'denied' : 'default';
  }

  const reg =
    (await navigator.serviceWorker.getRegistration(PUSH_SW_URL)) ??
    (await navigator.serviceWorker.register(PUSH_SW_URL, { scope: '/' }));

  // Wait until the worker is active so pushManager.subscribe doesn't race.
  if (reg.installing || reg.waiting) {
    await new Promise<void>((resolve) => {
      const worker = reg.installing ?? reg.waiting;
      if (!worker) return resolve();
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve();
      });
      // Fallback timeout
      setTimeout(() => resolve(), 4000);
    });
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const vapid = await fetchVapidPublicKey();
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    });
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const body = {
    endpoint: json.endpoint ?? sub.endpoint,
    p256dh: json.keys?.p256dh ?? bufferToBase64Url(sub.getKey('p256dh')),
    auth: json.keys?.auth ?? bufferToBase64Url(sub.getKey('auth')),
    userAgent: navigator.userAgent.slice(0, 255),
  };

  const resp = await fetch('/api/public/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error('Đăng ký thông báo thất bại');

  return 'subscribed';
}

export async function unsubscribePush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_URL);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    try {
      await fetch('/api/public/push/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
    } catch {
      /* ignore — still unsubscribe locally */
    }
    await sub.unsubscribe();
  }
  return Notification.permission === 'denied' ? 'denied' : 'default';
}

export type PushPreferences = {
  notify_gold: boolean;
  notify_crypto: boolean;
  notify_forex: boolean;
  notify_morning: boolean;
  notify_evening: boolean;
};

export const DEFAULT_PUSH_PREFS: PushPreferences = {
  notify_gold: true,
  notify_crypto: true,
  notify_forex: true,
  notify_morning: true,
  notify_evening: true,
};

export async function getCurrentPushEndpoint(): Promise<string | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_URL);
    const sub = await reg?.pushManager.getSubscription();
    return sub?.endpoint ?? null;
  } catch {
    return null;
  }
}

export async function fetchPushPreferences(endpoint: string): Promise<PushPreferences> {
  const r = await fetch(`/api/public/push/preferences?endpoint=${encodeURIComponent(endpoint)}`, {
    cache: 'no-store',
  });
  if (!r.ok) return DEFAULT_PUSH_PREFS;
  const data = (await r.json()) as Partial<PushPreferences>;
  return { ...DEFAULT_PUSH_PREFS, ...data };
}

export async function savePushPreferences(
  endpoint: string,
  prefs: Partial<PushPreferences>,
): Promise<void> {
  const r = await fetch('/api/public/push/preferences', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint, prefs }),
  });
  if (!r.ok) throw new Error('Không lưu được cài đặt thông báo');
}