import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { getPushState, isPushSupported, subscribePush, unsubscribePush, type PushState } from '@/lib/push';

/**
 * Compact bell icon in the header.
 * - First click: requests permission + subscribes to Web Push.
 * - Once subscribed: click toggles off.
 * - Hidden entirely on browsers that don't support Web Push.
 */
export function PushNotificationButton() {
  const [state, setState] = useState<PushState>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setState('unsupported');
      return;
    }
    getPushState().then(setState).catch(() => setState('default'));
  }, []);

  if (state === 'unsupported') return null;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (state === 'subscribed') {
        const next = await unsubscribePush();
        setState(next);
        toast.success('Đã tắt thông báo giá');
      } else if (state === 'denied') {
        toast.error('Trình duyệt đã chặn thông báo. Hãy bật lại trong cài đặt site.');
      } else {
        const next = await subscribePush();
        setState(next);
        if (next === 'subscribed') {
          toast.success('Đã bật thông báo giá — bạn sẽ nhận vào 9h sáng & 18h chiều');
        } else if (next === 'denied') {
          toast.error('Bạn đã từ chối quyền thông báo');
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  const Icon = state === 'subscribed' ? BellRing : state === 'denied' ? BellOff : Bell;
  const label =
    state === 'subscribed'
      ? 'Tắt thông báo giá'
      : state === 'denied'
        ? 'Thông báo đang bị chặn'
        : 'Bật thông báo giá (9h & 18h)';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card/40 text-muted-foreground transition-colors hover:border-[var(--gold)]/60 hover:text-foreground disabled:opacity-50 ${
        state === 'subscribed' ? 'text-[var(--gold)] border-[var(--gold)]/50' : ''
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}