import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  getCurrentRoute,
  trackPageview,
  trackScroll,
  trackDwell,
  trackOutbound,
  trackCta,
} from "@/lib/analytics/tracker";

/**
 * Mount 1 lần ở root: phát các sự kiện pageview / scroll / dwell / click.
 * Tracker tự lọc consent + DNT bên trong, hook này KHÔNG cần check.
 */
export function useAnalyticsTracker() {
  const router = useRouter();
  const lastRouteRef = useRef<string | null>(null);
  const dwellStartRef = useRef<number>(Date.now());
  const scrollHitRef = useRef<Set<number>>(new Set());

  // Pageview: phát khi route được resolve (cả lần đầu lẫn navigate).
  useEffect(() => {
    const fire = () => {
      const route = getCurrentRoute();
      if (lastRouteRef.current === route) return;
      // Dwell của route trước đó.
      if (lastRouteRef.current) {
        const secs = (Date.now() - dwellStartRef.current) / 1000;
        if (secs >= 2 && secs < 60 * 30) trackDwell(secs);
      }
      lastRouteRef.current = route;
      dwellStartRef.current = Date.now();
      scrollHitRef.current = new Set();
      trackPageview(route);
    };
    fire();
    const unsub = router.subscribe("onResolved", fire);
    return () => unsub();
  }, [router]);

  // Scroll depth: bắn 1 lần cho mỗi ngưỡng 25/50/75/100%.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      for (const t of [25, 50, 75, 100]) {
        if (pct >= t && !scrollHitRef.current.has(t)) {
          scrollHitRef.current.add(t);
          trackScroll(t);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click delegation: outbound link + bất kỳ phần tử có data-cta.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>("[data-cta], a[href]");
      if (!el) return;
      const cta = el.getAttribute("data-cta");
      if (cta) trackCta(cta);
      if (el.tagName === "A") {
        const href = (el as HTMLAnchorElement).href;
        try {
          const u = new URL(href, window.location.href);
          if (u.host && u.host !== window.location.host) {
            trackOutbound(u.href.slice(0, 255));
          }
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  // Dwell flush: khi unload, ghi dwell hiện hành (sendBeacon ở tracker).
  useEffect(() => {
    const flush = () => {
      const secs = (Date.now() - dwellStartRef.current) / 1000;
      if (secs >= 2 && secs < 60 * 30) trackDwell(secs);
      dwellStartRef.current = Date.now();
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);
}