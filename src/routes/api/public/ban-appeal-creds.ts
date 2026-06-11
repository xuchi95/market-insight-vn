import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Short-lived credential wrap/unwrap for the ban-appeal auto-login flow.
 *
 * Why: previously the user's password sat as plaintext in sessionStorage for
 * up to 15 minutes. Now the client only ever stores opaque ciphertext +
 * expiresAt; the AES-GCM key is derived on the server from
 * SUPABASE_SERVICE_ROLE_KEY via HKDF and never leaves the server. After
 * 5 minutes the server refuses to unwrap, so the blob becomes useless even
 * if it lingers in storage.
 */

const TTL_MS = 5 * 60_000;
const INFO = "mw:ban-appeal-creds:v1";

const WrapSchema = z.object({
  action: z.literal("wrap"),
  password: z.string().min(1).max(200),
});
const UnwrapSchema = z.object({
  action: z.literal("unwrap"),
  ciphertext: z.string().min(1).max(2000),
  iv: z.string().min(1).max(64),
  expiresAt: z.number().int().positive(),
});
const BodySchema = z.discriminatedUnion("action", [WrapSchema, UnwrapSchema]);

// Light per-IP rate limit (60 ops / 10 min) — these endpoints are cheap but
// we still don't want them used to bruteforce anything.
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || cur.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 10 * 60_000 });
    return true;
  }
  if (cur.count >= 60) return false;
  cur.count += 1;
  return true;
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(): Promise<CryptoKey> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("missing service role secret");
  const ikm = new TextEncoder().encode(secret);
  const baseKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
  // Fixed salt is fine — secrecy comes from the IKM, not the salt.
  const salt = new TextEncoder().encode("mw-ban-appeal-salt-v1");
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode(INFO) },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export const Route = createFileRoute("/api/public/ban-appeal-creds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        if (!rateLimit(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

        let body: unknown;
        try { body = await request.json(); }
        catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

        try {
          const key = await deriveKey();

          if (parsed.data.action === "wrap") {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const expiresAt = Date.now() + TTL_MS;
            // AAD binds the expiry into the ciphertext: even if the client
            // tampers with `expiresAt`, decryption fails.
            const aad = new TextEncoder().encode(String(expiresAt));
            const ct = await crypto.subtle.encrypt(
              { name: "AES-GCM", iv, additionalData: aad },
              key,
              new TextEncoder().encode(parsed.data.password),
            );
            return Response.json({
              ciphertext: b64encode(new Uint8Array(ct)),
              iv: b64encode(iv),
              expiresAt,
            });
          }

          // unwrap
          if (Date.now() > parsed.data.expiresAt) {
            return Response.json({ error: "expired" }, { status: 410 });
          }
          try {
            const aad = new TextEncoder().encode(String(parsed.data.expiresAt));
            const iv = b64decode(parsed.data.iv);
            const ct = b64decode(parsed.data.ciphertext);
            const pt = await crypto.subtle.decrypt(
              { name: "AES-GCM", iv: iv as BufferSource, additionalData: aad },
              key,
              ct as BufferSource,
            );
            return Response.json({ password: new TextDecoder().decode(pt) });
          } catch {
            return Response.json({ error: "invalid_ciphertext" }, { status: 400 });
          }
        } catch (err) {
          console.error("[ban-appeal-creds] crypto error", err);
          return Response.json({ error: "server_error" }, { status: 500 });
        }
      },
    },
  },
});