import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SubmitSchema = z.object({
  action: z.literal("submit"),
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
  reason: z.string().trim().min(20).max(2000),
});

const CheckSchema = z.object({
  action: z.literal("check"),
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

const BodySchema = z.discriminatedUnion("action", [SubmitSchema, CheckSchema]);

// Simple in-memory IP rate limit (10 / 10 min)
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || cur.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 10 * 60_000 });
    return true;
  }
  if (cur.count >= 10) return false;
  cur.count += 1;
  return true;
}

/**
 * Verify credentials AND that the account is currently banned.
 * Returns the user id when both hold true, otherwise an error code.
 */
async function verifyBannedCredentials(email: string, password: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const ANON = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const anon = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    const code = (error as { code?: string }).code;
    if (code === "user_banned" || msg.includes("banned")) {
      // Credentials are valid; account is banned. Look up the user id.
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const target = list?.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
      if (!target) return { ok: false as const, reason: "not_found" };
      return { ok: true as const, userId: target.id, email: target.email! };
    }
    return { ok: false as const, reason: "invalid_credentials" };
  }
  // Sign-in succeeded — account is NOT banned. Immediately sign out the new session.
  await anon.auth.signOut();
  return { ok: false as const, reason: "not_banned", userId: data.user?.id };
}

export const Route = createFileRoute("/api/public/ban-appeal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        if (!rateLimit(ip)) {
          return Response.json({ error: "rate_limited" }, { status: 429 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "invalid_input" }, { status: 400 });
        }

        const verified = await verifyBannedCredentials(parsed.data.email, parsed.data.password);
        if (!verified.ok) {
          if (verified.reason === "not_banned") {
            return Response.json({ error: "not_banned" }, { status: 409 });
          }
          if (verified.reason === "invalid_credentials") {
            return Response.json({ error: "invalid_credentials" }, { status: 401 });
          }
          return Response.json({ error: "not_found" }, { status: 404 });
        }

        // Look up existing appeal
        const { data: existing } = await supabaseAdmin
          .from("ban_appeals")
          .select("id,status,reason,admin_note,created_at,decided_at")
          .eq("user_id", verified.userId)
          .maybeSingle();

        if (parsed.data.action === "check") {
          return Response.json({
            ok: true,
            banned: true,
            email: verified.email,
            appeal: existing ?? null,
          });
        }

        if (existing) {
          return Response.json(
            { error: "already_submitted", appeal: existing },
            { status: 409 },
          );
        }

        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from("ban_appeals")
          .insert({
            user_id: verified.userId,
            email: verified.email,
            reason: parsed.data.reason,
            ip,
          })
          .select("id,status,reason,created_at")
          .single();
        if (insertErr) {
          // unique violation race
          if ((insertErr as { code?: string }).code === "23505") {
            return Response.json({ error: "already_submitted" }, { status: 409 });
          }
          console.error("[ban-appeal] insert failed", insertErr);
          return Response.json({ error: "db_error" }, { status: 500 });
        }

        return Response.json({ ok: true, appeal: inserted });
      },
    },
  },
});