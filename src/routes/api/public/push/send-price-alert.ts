import { createFileRoute } from '@tanstack/react-router';
import { getRequestHost, getRequestHeader } from '@tanstack/react-start/server';

/**
 * POST /api/public/push/send-price-alert
 *
 * Cron endpoint — pg_cron gọi lúc 9h sáng (02:00 UTC) và 18h chiều (11:00 UTC)
 * giờ Việt Nam. Lấy snapshot vàng / coin / ngoại tệ rồi gửi Web Push đến tất cả
 * subscription đã đăng ký.
 *
 * Bảo mật: kiểm tra header `apikey` khớp với Supabase anon key — pg_cron đã có
 * sẵn nên không cần thêm shared secret mới.
 */

const FROZEN_CODES = ['BTC', 'ETH', 'USD', 'SJC'] as const;

interface SnapshotItem {
  code: string;
  name: string;
  price: number;
  unit: string;
  changePct: number | null;
}

async function safeJson(url: string, timeoutMs = 3000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function fmtPrice(n: number, code: string): string {
  if (code === 'SJC') return `${(n / 1_000_000).toFixed(2)}tr`;
  if (code === 'USD') return `${n.toLocaleString('vi-VN')}đ`;
  if (n >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`;
  return `$${n.toFixed(2)}`;
}

function fmtChange(p: number | null): string {
  if (p == null || !isFinite(p)) return '';
  const arrow = p >= 0 ? '▲' : '▼';
  return ` ${arrow}${Math.abs(p).toFixed(2)}%`;
}

async function buildSnapshot(origin: string): Promise<SnapshotItem[]> {
  const snap = (await safeJson(`${origin}/api/public/widget-snapshot`)) as {
    items?: SnapshotItem[];
  } | null;
  const items = Array.isArray(snap?.items) ? snap!.items : [];
  // Lọc đúng các mã đã hứa với user.
  const map = new Map(items.map((i) => [i.code.replace('/VND', ''), i] as const));
  const ordered: SnapshotItem[] = [];
  for (const code of FROZEN_CODES) {
    const found = map.get(code);
    if (found) ordered.push({ ...found, code });
  }
  return ordered;
}

export const Route = createFileRoute('/api/public/push/send-price-alert')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: apikey header must match Supabase anon key (pg_cron pattern).
        const apikey =
          request.headers.get('apikey') ?? request.headers.get('x-apikey') ?? '';
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ??
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
          '';
        if (!expected || apikey !== expected) {
          return new Response('Unauthorized', { status: 401 });
        }

        // Origin to call our own public endpoints
        let origin = '';
        try {
          const host = getRequestHost();
          const proto = getRequestHeader('x-forwarded-proto') ?? 'https';
          if (host) origin = `${proto}://${host}`;
        } catch {
          /* */
        }
        if (!origin) origin = 'https://marketwatch.vn';

        const items = await buildSnapshot(origin);
        if (items.length === 0) {
          return new Response(JSON.stringify({ ok: false, reason: 'no_data' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        // Compose 1-line body (system push UI is small)
        const body = items
          .map((i) => `${i.code} ${fmtPrice(i.price, i.code)}${fmtChange(i.changePct)}`)
          .join(' · ');

        const now = new Date();
        const hourVN = (now.getUTCHours() + 7) % 24;
        const periodLabel = hourVN < 12 ? 'sáng' : 'chiều';
        const title = `Giá thị trường ${periodLabel} ${hourVN}:00`;
        const payload = JSON.stringify({
          title,
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          url: 'https://marketwatch.vn/',
          tag: `mw-price-${periodLabel}`,
        });

        // Load admin client + web-push inside handler (server-only).
        const [{ supabaseAdmin }, webpushMod] = await Promise.all([
          import('@/integrations/supabase/client.server'),
          import('web-push'),
        ]);
        const webpush = (webpushMod as unknown as { default: typeof webpushMod }).default ?? webpushMod;

        const vapidPublic = process.env.VAPID_PUBLIC_KEY ?? '';
        const vapidPrivate = process.env.VAPID_PRIVATE_KEY ?? '';
        const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:admin@marketwatch.vn';
        if (!vapidPublic || !vapidPrivate) {
          return new Response('VAPID keys missing', { status: 500 });
        }
        try {
          (webpush as any).setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
        } catch (e) {
          return new Response(`VAPID config error: ${String(e)}`, { status: 500 });
        }

        const { data: subs, error } = await supabaseAdmin
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth, fail_count')
          .limit(5000);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          });
        }

        let sent = 0;
        let removed = 0;
        let failed = 0;
        const deadEndpoints: string[] = [];
        const failingEndpoints: string[] = [];

        // Gửi tuần tự thành các batch 50 để tránh nuốt CPU worker.
        const list = subs ?? [];
        for (let i = 0; i < list.length; i += 50) {
          const batch = list.slice(i, i + 50);
          const results = await Promise.allSettled(
            batch.map((s) =>
              (webpush as any).sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
                { TTL: 6 * 60 * 60 },
              ),
            ),
          );
          results.forEach((res, idx) => {
            const sub = batch[idx];
            if (res.status === 'fulfilled') {
              sent++;
            } else {
              const reason = res.reason as { statusCode?: number; message?: string };
              const status = reason?.statusCode;
              if (status === 404 || status === 410) {
                deadEndpoints.push(sub.endpoint);
              } else {
                failed++;
                failingEndpoints.push(sub.endpoint);
              }
            }
          });
        }

        if (deadEndpoints.length > 0) {
          const { error: delErr } = await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .in('endpoint', deadEndpoints);
          if (!delErr) removed = deadEndpoints.length;
        }

        // Tăng fail_count cho các endpoint lỗi không-fatal
        if (failingEndpoints.length > 0) {
          for (const ep of failingEndpoints) {
            await supabaseAdmin
              .from('push_subscriptions')
              .update({ last_error: 'send_failed' })
              .eq('endpoint', ep);
          }
        }

        // Update last_success_at cho batch success — gộp lại bằng 1 UPDATE qua RPC không có sẵn,
        // nên chỉ stamp khi cần thiết: bỏ qua để giảm I/O.

        return new Response(
          JSON.stringify({ ok: true, total: list.length, sent, removed, failed, items }),
          { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } },
        );
      },
    },
  },
});