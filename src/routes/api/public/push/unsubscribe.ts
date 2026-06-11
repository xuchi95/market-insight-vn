import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const Schema = z.object({ endpoint: z.string().url().max(2048) });

export const Route = createFileRoute('/api/public/push/unsubscribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let endpoint: string;
        try {
          const raw = await request.json();
          endpoint = Schema.parse(raw).endpoint;
        } catch {
          return new Response('Invalid payload', { status: 400 });
        }
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        });
      },
    },
  },
});