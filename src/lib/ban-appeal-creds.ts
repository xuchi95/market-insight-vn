/**
 * Client helper for short-lived, encrypted ban-appeal credential storage.
 *
 * Plaintext password is NEVER persisted. We POST it to
 * `/api/public/ban-appeal-creds` (action=wrap), the server returns
 * `{ ciphertext, iv, expiresAt }`, and only that opaque blob lives in
 * sessionStorage. After 5 minutes the server refuses to unwrap.
 */

const STORAGE_KEY = "mw:ban-appeal-creds";

interface StoredBlob {
  email: string;
  ciphertext: string;
  iv: string;
  expiresAt: number;
}

function readBlob(): StoredBlob | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Partial<StoredBlob>;
    if (!obj?.email || !obj.ciphertext || !obj.iv || typeof obj.expiresAt !== "number") return null;
    if (Date.now() > obj.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return obj as StoredBlob;
  } catch {
    return null;
  }
}

export function clearPendingBanCreds() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/** Email + ms-until-expiry, without touching the password. */
export function peekPendingBanCreds(): { email: string; expiresAt: number } | null {
  const b = readBlob();
  return b ? { email: b.email, expiresAt: b.expiresAt } : null;
}

export async function setPendingBanCreds(email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch("/api/public/ban-appeal-creds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "wrap", password }),
    });
    if (!res.ok) return false;
    const j = (await res.json()) as { ciphertext?: string; iv?: string; expiresAt?: number };
    if (!j.ciphertext || !j.iv || !j.expiresAt) return false;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      email,
      ciphertext: j.ciphertext,
      iv: j.iv,
      expiresAt: j.expiresAt,
    } satisfies StoredBlob));
    return true;
  } catch {
    return false;
  }
}

export type ReadCredsResult =
  | { ok: true; email: string; password: string; expiresAt: number }
  | { ok: false; reason: "missing" | "expired" | "network" };

export async function readPendingBanCreds(): Promise<ReadCredsResult> {
  const blob = readBlob();
  if (!blob) return { ok: false, reason: "missing" };
  try {
    const res = await fetch("/api/public/ban-appeal-creds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "unwrap",
        ciphertext: blob.ciphertext,
        iv: blob.iv,
        expiresAt: blob.expiresAt,
      }),
    });
    if (res.status === 410) {
      clearPendingBanCreds();
      return { ok: false, reason: "expired" };
    }
    if (!res.ok) return { ok: false, reason: "network" };
    const j = (await res.json()) as { password?: string };
    if (!j.password) return { ok: false, reason: "network" };
    return { ok: true, email: blob.email, password: j.password, expiresAt: blob.expiresAt };
  } catch {
    return { ok: false, reason: "network" };
  }
}