/**
 * Per-device, per-user "trust this device" state for MFA.
 * Stored in localStorage so it survives across sessions but stays
 * scoped to the current browser/device.
 */
const KEY = "mw_mfa_trusted_devices";
const DAY = 24 * 60 * 60 * 1000;

type TrustMap = Record<string, number>;

function read(): TrustMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as TrustMap) : {};
  } catch {
    return {};
  }
}

function write(map: TrustMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

export function isDeviceTrusted(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const map = read();
  const exp = map[userId];
  if (!exp || typeof exp !== "number") return false;
  if (Date.now() >= exp) {
    delete map[userId];
    write(map);
    return false;
  }
  return true;
}

export function trustDevice(userId: string, days = 30) {
  if (!userId) return;
  const map = read();
  map[userId] = Date.now() + Math.max(1, days) * DAY;
  write(map);
}

export function clearTrustedDevice(userId?: string | null) {
  const map = read();
  if (userId) {
    delete map[userId];
  } else {
    for (const k of Object.keys(map)) delete map[k];
  }
  write(map);
}