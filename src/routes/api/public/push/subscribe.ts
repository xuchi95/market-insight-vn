import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { getRequestHeader } from '@tanstack/react-start/server';

/**
 * POST /api/public/push/subscribe
 * Lưu PushSubscription mới (hoặc cập nhật keys cho endpoint cũ).
 * Có rate-limit theo IP để chống spam.
 */

const SubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(20).max(255).regex(/^[A-Za-z0-9_-]+$/),
  auth: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
  userAgent: z.string().max(255).optional(),
});

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX_PER_WINDOW) return false;
  b.count += 1;
  return true;
}

function getIp(): string {
  try {
    return (
      getRequestHeader('cf-connecting-ip') ??
      getRequestHeader('x-forwarded-for')?.split(',')[0]?.trim() ??
      getRequestHeader('x-real-ip') ??
      'unknown'
    );
  } catch {
    return 'unknown';
  }
}

export const Route = createFileRoute('/api/public/push/subscribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!rateLimit(getIp())) {
          return new Response('Too many requests', { status: 429 });
        }

        let parsed: z.infer<typeof SubscribeSchema>;
        try {
          const raw = await request.json();
          parsed = SubscribeSchema.parse(raw);
        } catch {
          return new Response('Invalid payload', { status: 400 });
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

        const { error } = await supabaseAdmin
          .from('push_subscriptions')
          .upsert(
            {
              endpoint: parsed.endpoint,
              p256dh: parsed.p256dh,
              auth: parsed.auth,
              user_agent: parsed.userAgent ?? null,
              fail_count: 0,
              last_error: null,
            },
            { onConflict: 'endpoint' },
          );

        if (error) {
          return new Response('Storage error', { status: 500 });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        });
      },
    },
  },
});