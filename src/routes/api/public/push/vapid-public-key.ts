import { createFileRoute } from '@tanstack/react-router';

/**
 * GET /api/public/push/vapid-public-key
 * Trả về VAPID public key cho client để tạo PushSubscription.
 * Public key là PUBLIC theo thiết kế Web Push, an toàn để lộ.
 */
export const Route = createFileRoute('/api/public/push/vapid-public-key')({
  server: {
    handlers: {
      GET: async () => {
        const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
        return new Response(JSON.stringify({ publicKey }), {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'public, max-age=3600, s-maxage=3600',
          },
        });
      },
    },
  },
});