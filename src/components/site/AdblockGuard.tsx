import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdblockSettings, type AdblockSettings } from "@/lib/admin/adblock.functions";

/** URL/script mà adblocker phổ biến (EasyList/ABP) chặn. Tạo mới mỗi lần check
 * để tránh cache và để bắt được trạng thái khi user bật lại adblock không reload trang. */
function baitUrls() {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return [
    `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1602622310716271&_mw_adb=${nonce}`,
    `https://securepubads.g.doubleclick.net/tag/js/gpt.js?_mw_adb=${nonce}`,
  ];
}

function detectBlockedScript(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    const done = (blocked: boolean) => {
      window.clearTimeout(timeout);
      script.remove();
      resolve(blocked);
    };
    const timeout = window.setTimeout(() => done(true), 2200);
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = url;
    script.onload = () => done(false);
    script.onerror = () => done(true);
    document.head.appendChild(script);
  });
}

const DISMISS_KEY = "mw-adblock-dismiss";

function isDismissValid(cooldownHours: number): boolean {
  if (cooldownHours <= 0) return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!ts) return false;
    return Date.now() - ts < cooldownHours * 3600_000;
  } catch {
    return false;
  }
}

/** Detect adblock bằng 3 phương pháp song song; bất kỳ phương pháp nào
 *  flag = true ⇒ user đang chặn quảng cáo. */
async function detectAdblock(s: AdblockSettings): Promise<boolean> {
  const checks: Promise<boolean>[] = [];

  if (s.detection_bait) {
    checks.push(
      new Promise<boolean>((resolve) => {
        const bait = document.createElement("div");
        bait.className = "ads ad adsbox doubleclick ad-placement carbon-ads ad-banner adsbygoogle";
        bait.setAttribute("aria-hidden", "true");
        bait.style.cssText =
          "position:absolute!important;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;";
        bait.innerHTML = "&nbsp;";
        document.body.appendChild(bait);
        // Cho adblocker thời gian áp dụng CSS/DOM filter.
        setTimeout(() => {
          const cs = window.getComputedStyle(bait);
          const blocked =
            bait.offsetHeight === 0 ||
            bait.offsetParent === null ||
            cs.display === "none" ||
            cs.visibility === "hidden";
          bait.remove();
          resolve(blocked);
        }, 120);
      }),
    );
  }

  const urls = baitUrls();

  if (s.detection_fetch) {
    checks.push(
      (async () => {
        for (const url of urls) {
          try {
            await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store" });
          } catch {
            return true; // fetch bị block ⇒ adblock active
          }
        }
        return false;
      })(),
    );
  }

  if (s.detection_script) {
    checks.push(
      (async () => {
        for (const url of urls) {
          if (await detectBlockedScript(url)) return true;
        }
        return false;
      })(),
    );
  }

  if (checks.length === 0) return false;
  const results = await Promise.all(checks);
  return results.some(Boolean);
}

function themeColors(s: AdblockSettings) {
  switch (s.theme) {
    case "light":
      return { bg: "#fbf7ee", text: "#2a241b", accent: "#8a6a1f", overlay: "#1a1a1a" };
    case "dark":
      return { bg: "#1a1a1a", text: "#f5f0df", accent: "#c9a84c", overlay: "#000000" };
    case "gold":
      return { bg: "#2a1f0a", text: "#f0d78c", accent: "#c9a84c", overlay: "#0d0d0d" };
    case "custom":
    default:
      return {
        bg: s.bg_color,
        text: s.text_color,
        accent: s.accent_color,
        overlay: s.overlay_color,
      };
  }
}

export function AdblockGuard() {
  const fetchSettings = useServerFn(getAdblockSettings);
  const { data } = useQuery({
    queryKey: ["adblock-settings"],
    queryFn: () => fetchSettings(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const settings = data?.settings ?? null;
  const [detected, setDetected] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = useRef(false);

  // Path whitelist
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const whitelisted = settings?.whitelist_paths.some((p) => {
    if (!p) return false;
    if (p === path) return true;
    if (p.endsWith("*")) return path.startsWith(p.slice(0, -1));
    return false;
  });

  useEffect(() => {
    if (!settings || whitelisted) return;
    if (
      settings.mode !== "hard" &&
      settings.allow_dismiss &&
      isDismissValid(settings.dismiss_cooldown_hours)
    ) {
      setDismissed(true);
      return;
    }
    setDismissed(false);
    let cancelled = false;
    const run = async () => {
      if (running.current) return;
      running.current = true;
      const isBlocked = await detectAdblock(settings);
      running.current = false;
      if (!cancelled) {
        if (isBlocked) {
          try {
            localStorage.removeItem(DISMISS_KEY);
          } catch {
            // Ignore storage access errors in private/restricted browsing modes.
          }
          setDismissed(false);
        }
        setDetected(isBlocked);
      }
    };
    // Chạy lần đầu sau 800ms để AdSense script kịp khởi tạo nếu KHÔNG bị block.
    const initial = setTimeout(run, 800);
    // Luôn recheck định kỳ để khi user bật lại adblock thì popup hiện trở lại.
    const intervalMs = Math.max(3, settings.recheck_interval_sec || 5) * 1000;
    timer.current = setInterval(run, intervalMs);
    const wakeEvents = [
      "focus",
      "visibilitychange",
      "pageshow",
      "online",
      "pointerdown",
      "keydown",
    ] as const;
    wakeEvents.forEach((eventName) => window.addEventListener(eventName, run, { passive: true }));
    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (timer.current) clearInterval(timer.current);
      wakeEvents.forEach((eventName) => window.removeEventListener(eventName, run));
    };
  }, [settings, whitelisted]);

  const visible = !!(mounted && settings && detected && !dismissed && !whitelisted);

  // Khoá scroll body khi popup overlay đang hiện.
  useEffect(() => {
    if (!visible) return;
    const layout = settings?.layout;
    const isOverlay = layout === "modal" || layout === "fullscreen";
    if (!isOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible, settings?.layout]);

  // ============================================================
  // ANTI-TAMPER (hard mode): chống bypass bằng DevTools / userscript.
  // - Inject <style> ẩn toàn bộ nội dung trang trừ guard.
  // - MutationObserver canh giữ <html>.class, <style>, và guard node:
  //   nếu bị xoá / sửa → restore tức thì.
  // - RAF loop tái áp dụng inline style của overlay mỗi frame.
  // - Chặn Ctrl/Cmd+các phím tắt thường dùng để inspect / chọn / copy.
  // ============================================================
  const guardRef = useRef<HTMLDivElement | null>(null);
  const isHardLock = !!(visible && settings && settings.mode === "hard");
  useEffect(() => {
    if (!isHardLock) return;
    const HTML_CLASS = "mw-ab-locked";
    const STYLE_ID = "mw-ab-lock-style";
    const html = document.documentElement;

    const ensureStyle = () => {
      let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
      const css = `
        html.${HTML_CLASS} body > *:not([data-mw-ab-guard]) {
          visibility: hidden !important;
          pointer-events: none !important;
          user-select: none !important;
        }
        html.${HTML_CLASS} { overflow: hidden !important; }
        [data-mw-ab-guard] { visibility: visible !important; pointer-events: auto !important; }
      `;
      if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        el.setAttribute("data-mw-ab-guard-style", "1");
        document.head.appendChild(el);
      }
      if (el.textContent !== css) el.textContent = css;
    };

    const ensureClass = () => {
      if (!html.classList.contains(HTML_CLASS)) html.classList.add(HTML_CLASS);
    };

    const ensureGuard = () => {
      const node = guardRef.current;
      if (!node) return;
      if (!document.body.contains(node)) {
        try {
          document.body.appendChild(node);
        } catch {
          /* ignore */
        }
      }
      if (node.getAttribute("data-mw-ab-guard") !== "1") {
        node.setAttribute("data-mw-ab-guard", "1");
      }
      // Reinforce critical inline styles so DevTools edits get reverted.
      // Only set when missing/changed to avoid feedback loops with MutationObserver.
      const want: Record<string, string> = {
        position: "fixed",
        inset: "0",
        "z-index": "2147483647",
        display: "flex",
        "pointer-events": "auto",
        visibility: "visible",
        opacity: "1",
      };
      for (const [k, v] of Object.entries(want)) {
        if (node.style.getPropertyValue(k) !== v || node.style.getPropertyPriority(k) !== "important") {
          node.style.setProperty(k, v, "important");
        }
      }
    };

    // Throttle reinforcement so it never runs more than once per animation frame.
    // Without this, the MutationObserver fires on every style write and recurses,
    // and the per-frame RAF loop burns CPU on every page.
    let pending = false;
    let obs: MutationObserver | null = null;
    const reinforce = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        // Pause observer while we mutate to avoid feedback loops.
        obs?.disconnect();
        ensureClass();
        ensureStyle();
        ensureGuard();
        if (obs) {
          obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
          obs.observe(document.head, { childList: true });
          obs.observe(document.body, { childList: true });
        }
      });
    };
    obs = new MutationObserver(reinforce);
    reinforce();
    // Periodic safety net (every 1s) instead of per-frame RAF — covers DevTools edits
    // without melting the CPU.
    const safety = setInterval(reinforce, 1000);

    // Block common shortcuts that help bypass (F12 / Ctrl+Shift+I/J/C / Ctrl+U / Ctrl+S).
    const blockKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        k === "f12" ||
        (ctrl && e.shiftKey && (k === "i" || k === "j" || k === "c")) ||
        (ctrl && (k === "u" || k === "s" || k === "p"))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const blockCtx = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", blockKey, true);
    window.addEventListener("contextmenu", blockCtx, true);

    return () => {
      obs?.disconnect();
      clearInterval(safety);
      window.removeEventListener("keydown", blockKey, true);
      window.removeEventListener("contextmenu", blockCtx, true);
      html.classList.remove(HTML_CLASS);
      document.getElementById(STYLE_ID)?.remove();
    };
  }, [isHardLock]);

  if (!visible || !settings) return null;

  const c = themeColors(settings);
  const handleRetry = async () => {
    const still = await detectAdblock(settings);
    if (!still) setDetected(false);
  };
  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore storage access errors in private/restricted browsing modes.
    }
    setDismissed(true);
  };

  const isModal = settings.layout === "modal" || settings.layout === "fullscreen";
  const isBanner = settings.layout === "banner_top" || settings.layout === "banner_bottom";
  const isCorner = settings.layout === "corner";
  const isHard = settings.mode === "hard";

  const card = (
    <div
      role="dialog"
      aria-modal={isModal && isHard ? "true" : "false"}
      aria-labelledby="mw-adblock-title"
      style={{
        background: c.bg,
        color: c.text,
        borderRadius: settings.layout === "fullscreen" || isBanner ? 0 : settings.border_radius,
        border: `1px solid ${c.accent}55`,
        boxShadow: isModal ? `0 30px 80px -20px ${c.overlay}` : "none",
        padding: isBanner ? "14px 20px" : "28px 28px",
        maxWidth: settings.layout === "fullscreen" ? "100%" : isBanner ? "100%" : 480,
        width: "100%",
        display: "flex",
        flexDirection: isBanner ? "row" : "column",
        alignItems: isBanner ? "center" : "flex-start",
        gap: isBanner ? 16 : 12,
      }}
    >
      {settings.show_logo && !isBanner && (
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${c.accent}, ${c.accent}88)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            color: c.bg,
          }}
        >
          M
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          id="mw-adblock-title"
          style={{
            margin: 0,
            fontSize: isBanner ? 15 : 19,
            lineHeight: 1.3,
            fontWeight: 700,
            color: c.accent,
          }}
        >
          {settings.title}
        </h2>
        <p
          style={{ margin: "8px 0 0", fontSize: isBanner ? 13 : 14, lineHeight: 1.5, opacity: 0.9 }}
        >
          {settings.message}
        </p>
        {settings.secondary_message && !isBanner && (
          <p style={{ margin: "10px 0 0", fontSize: 12, opacity: 0.7 }}>
            {settings.secondary_message}
          </p>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: isBanner ? 0 : 16,
          width: isBanner ? "auto" : "100%",
        }}
      >
        {settings.show_retry && (
          <button
            onClick={handleRetry}
            style={{
              background: c.accent,
              color: c.bg,
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
              flex: isBanner ? "none" : 1,
            }}
          >
            {settings.button_text}
          </button>
        )}
        {settings.allow_dismiss && settings.mode !== "hard" && (
          <button
            onClick={handleDismiss}
            style={{
              background: "transparent",
              color: c.text,
              border: `1px solid ${c.text}33`,
              padding: "10px 16px",
              borderRadius: 8,
              fontWeight: 500,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {settings.dismiss_text || "Bỏ qua"}
          </button>
        )}
      </div>
    </div>
  );

  // Banner / corner: không overlay (theo thiết kế của layout này).
  if (isBanner || isCorner) {
    const pos: React.CSSProperties = isCorner
      ? { position: "fixed", right: 20, bottom: 20, zIndex: 2147483000, maxWidth: 380 }
      : settings.layout === "banner_top"
        ? { position: "fixed", top: 0, left: 0, right: 0, zIndex: 2147483000 }
        : { position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 2147483000 };
    return createPortal(
      <div ref={guardRef} data-mw-ab-guard="1" style={pos}>
        {card}
      </div>,
      document.body,
    );
  }

  // Modal / fullscreen với overlay (hard hoặc dismiss mode).
  // Overlay phủ kín viewport, BẮT mọi pointer/touch/keyboard event để nền
  // phía sau hoàn toàn không thể tương tác hay scroll.
  const blockBg = (e: React.SyntheticEvent) => {
    if (e.target !== e.currentTarget) return; // cho phép tương tác trong card
    e.preventDefault();
    e.stopPropagation();
  };
  return createPortal(
    <div
      ref={guardRef}
      data-mw-ab-guard="1"
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: `${c.overlay}${Math.round(settings.overlay_opacity * 255)
          .toString(16)
          .padStart(2, "0")}`,
        backdropFilter:
          settings.backdrop_blur > 0 ? `blur(${settings.backdrop_blur}px)` : undefined,
        WebkitBackdropFilter:
          settings.backdrop_blur > 0 ? `blur(${settings.backdrop_blur}px)` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: settings.layout === "fullscreen" ? 0 : 20,
        overflow: "auto",
        pointerEvents: "auto",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        cursor: isHard ? "not-allowed" : "default",
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (!isHard && settings.allow_dismiss) handleDismiss();
        else e.preventDefault();
      }}
      onContextMenu={blockBg}
      onWheel={blockBg}
      onTouchMove={blockBg}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      {card}
    </div>,
    document.body,
  );
}
