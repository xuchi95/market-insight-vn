import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Sunrise, Sunset, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getPushState, isPushSupported, subscribePush, unsubscribePush, type PushState } from '@/lib/push';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Compact bell icon in the header.
 * - First click: requests permission + subscribes to Web Push.
 * - Once subscribed: click toggles off.
 * - Hidden entirely on browsers that don't support Web Push.
 */
export function PushNotificationButton() {
  const [state, setState] = useState<PushState>('default');
  const [busy, setBusy] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const { prefs, decided } = useCookieConsent();
  const marketingAllowed = decided && prefs.marketing;

  useEffect(() => {
    if (!isPushSupported()) {
      setState('unsupported');
      return;
    }
    getPushState().then(setState).catch(() => setState('default'));
  }, []);

  // Nếu người dùng đã quyết định cookie và TỪ CHỐI nhóm "Tiếp thị" mà thiết bị
  // vẫn đang đăng ký push → tự huỷ để tuân thủ Chính sách Cookie.
  useEffect(() => {
    if (!decided || prefs.marketing) return;
    if (state !== 'subscribed') return;
    let cancelled = false;
    (async () => {
      try {
        const next = await unsubscribePush();
        if (!cancelled) setState(next);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [decided, prefs.marketing, state]);

  if (state === 'unsupported') return null;

  const doSubscribe = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await subscribePush();
      setState(next);
      if (next === 'subscribed') {
        setIntroOpen(false);
        toast.success('Đã bật thông báo giá — bạn sẽ nhận vào 9h sáng & 18h chiều');
      } else if (next === 'denied') {
        toast.error('Bạn đã từ chối quyền thông báo');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  const handleClick = async () => {
    if (busy) return;
    if (state === 'subscribed') {
      setBusy(true);
      try {
        const next = await unsubscribePush();
        setState(next);
        toast.success('Đã tắt thông báo giá');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Có lỗi xảy ra');
      } finally {
        setBusy(false);
      }
      return;
    }
    // Bật thông báo đòi hỏi đồng ý nhóm cookie "Tiếp thị".
    if (!marketingAllowed) {
      toast.message('Cần bật cookie "Tiếp thị" để nhận thông báo giá', {
        description: 'Mở Tuỳ chỉnh Cookie và bật nhóm Tiếp thị để tiếp tục.',
        action: {
          label: 'Mở cài đặt',
          onClick: () =>
            window.dispatchEvent(new CustomEvent('mw:open-cookie-settings')),
        },
      });
      return;
    }
    // Mở popup giới thiệu trước khi xin quyền trình duyệt
    setIntroOpen(true);
  };

  const Icon = state === 'subscribed' ? BellRing : state === 'denied' ? BellOff : Bell;
  const label =
    state === 'subscribed'
      ? 'Tắt thông báo giá'
      : state === 'denied'
        ? 'Thông báo đang bị chặn'
        : 'Bật thông báo giá (9h & 18h)';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-label={label}
        title={label}
        className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-[var(--gold)] hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)] disabled:opacity-50 ${
          state === 'subscribed' ? 'text-[var(--gold)]' : ''
        }`}
      >
        <Icon className="h-4 w-4" />
      </button>

      <Dialog open={introOpen} onOpenChange={setIntroOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-[var(--gold)]" />
              Bật thông báo giá mỗi ngày
            </DialogTitle>
            <DialogDescription>
              Nhận tóm tắt biến động vàng, USD/VND và crypto trực tiếp trên trình duyệt — miễn phí, không cần đăng nhập.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Sunrise className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <span><span className="font-semibold">9h sáng</span> — giá mở phiên: vàng, tỷ giá, crypto.</span>
            </li>
            <li className="flex items-start gap-2">
              <Sunset className="h-4 w-4 mt-0.5 text-rose-500 shrink-0" />
              <span><span className="font-semibold">18h chiều</span> — tổng kết biến động trong ngày.</span>
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
              <span>Có thể tắt bất cứ lúc nào bằng cách bấm lại chuông.</span>
            </li>
          </ul>

          <p className="text-xs text-muted-foreground">
            Sau khi bấm "Bật thông báo", trình duyệt sẽ hỏi bạn cấp quyền hiển thị thông báo.
          </p>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setIntroOpen(false)} disabled={busy}>
              Để sau
            </Button>
            <Button onClick={doSubscribe} disabled={busy} className="gap-1">
              <Bell className="h-4 w-4" />
              {busy ? 'Đang bật…' : 'Bật thông báo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}