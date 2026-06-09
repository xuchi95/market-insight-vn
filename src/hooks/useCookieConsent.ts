import { useEffect, useState } from "react";

/** Đọc/đăng ký theo dõi trạng thái Cookie Consent đã lưu ở localStorage
 *  bởi `src/components/site/CookieConsent.tsx`. Giữ key/version đồng bộ
 *  với component đó. */

const STORAGE_KEY = "mw_cookie_consent";
const VERSION = "1.0";

export type ConsentPrefs = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

type StoredConsent = {
  version: string;
  acceptedAt: string;
  prefs: ConsentPrefs;
};

const DENIED: ConsentPrefs = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

function read(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== VERSION) return null;
    const ageMs = Date.now() - new Date(parsed.acceptedAt).getTime();
    if (ageMs > 1000 * 60 * 60 * 24 * 365) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Trả về preferences hiện tại (hoặc DENIED nếu chưa đồng ý / chưa hydrate). */
export function getCookieConsent(): ConsentPrefs {
  return read()?.prefs ?? DENIED;
}

/** Đã có quyết định cookie hay chưa (banner đã được tương tác). */
export function hasCookieDecision(): boolean {
  return read() !== null;
}

/** Hook React tự cập nhật khi banner phát event `mw:cookie-consent`
 *  hoặc storage thay đổi (tab khác). */
export function useCookieConsent(): {
  prefs: ConsentPrefs;
  decided: boolean;
} {
  const [state, setState] = useState<{ prefs: ConsentPrefs; decided: boolean }>(
    () => ({ prefs: DENIED, decided: false }),
  );

  useEffect(() => {
    const sync = () => {
      const stored = read();
      setState({ prefs: stored?.prefs ?? DENIED, decided: !!stored });
    };
    sync();
    const onCustom = () => sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener("mw:cookie-consent", onCustom as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("mw:cookie-consent", onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return state;
}