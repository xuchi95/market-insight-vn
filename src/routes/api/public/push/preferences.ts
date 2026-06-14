import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

/**
 * GET  /api/public/push/preferences?endpoint=...  → trả về prefs hiện tại
 * POST /api/public/push/preferences { endpoint, prefs } → cập nhật prefs
 *
 * push_subscriptions là service_role-only nên gọi qua admin client.
 * Endpoint là khoá định danh (URL dài, khó đoán) — không cần auth user vì
 * subscription cũng được tạo ẩn danh từ trình duyệt.
 */

const PrefsSchema = z.object({
  notify_gold: z.boolean().optional(),
  notify_crypto: z.boolean().optional(),
  notify_forex: z.boolean().optional(),
  notify_morning: z.boolean().optional(),
  notify_evening: z.boolean().optional(),
  min_change_pct: z.number().min(0).max(50).optional(),
});

const PostSchema = z.object({
  endpoint: z.string().url().max(2048),
  prefs: PrefsSchema,
});

const PREF_COLS =
  'notify_gold, notify_crypto, notify_forex, notify_morning, notify_evening, min_change_pct';

export const Route = createFileRoute('/api/public/push/preferences')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const endpoint = url.searchParams.get('endpoint') ?? '';
        if (!endpoint || endpoint.length > 2048) {
          return new Response('Invalid endpoint', { status: 400 });
        }
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { data, error } = await supabaseAdmin
          .from('push_subscriptions')
          .select(PREF_COLS)
          .eq('endpoint', endpoint)
          .maybeSingle();
        if (error) return new Response('Storage error', { status: 500 });
        if (!data) return new Response('Not found', { status: 404 });
        return Response.json(data);
      },
      POST: async ({ request }) => {
        let parsed: z.infer<typeof PostSchema>;
        try {
          parsed = PostSchema.parse(await request.json());
        } catch {
          return new Response('Invalid payload', { status: 400 });
        }
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { error } = await supabaseAdmin
          .from('push_subscriptions')
          .update(parsed.prefs)
          .eq('endpoint', parsed.endpoint);
        if (error) return new Response('Storage error', { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});