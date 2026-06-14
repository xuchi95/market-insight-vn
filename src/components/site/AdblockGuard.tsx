import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdblockSettings, type AdblockSettings } from "@/lib/admin/adblock.functions";

/** Các URL/script mà adblocker phổ biến (EasyList) chặn — fetch sẽ fail/abort. */
const BAIT_URLS = [
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?_adb=" + Date.now(),
  "/ads.js?_adb=" + Date.now(),
];

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
        bait.className =
          "ads ad adsbox doubleclick ad-placement carbon-ads ad-banner adsbygoogle";
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

  if (s.detection_fetch) {
    checks.push(
      (async () => {
        for (const url of BAIT_URLS) {
          try {
            await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
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
      Promise.resolve(
        typeof window.adsbygoogle === "undefined" ||
          (Array.isArray(window.adsbygoogle) === false &&
            typeof window.adsbygoogle !== "object"),
      ),
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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (isDismissValid(settings.dismiss_cooldown_hours)) {
      setDismissed(true);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const isBlocked = await detectAdblock(settings);
      if (!cancelled) setDetected(isBlocked);
    };
    // Chạy lần đầu sau 800ms để AdSense script kịp khởi tạo nếu KHÔNG bị block.
    const initial = setTimeout(run, 800);
    // Luôn recheck định kỳ để khi user bật lại adblock thì popup hiện trở lại.
    const intervalMs = Math.max(3, settings.recheck_interval_sec || 5) * 1000;
    timer.current = setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (timer.current) clearInterval(timer.current);
    };
  }, [settings, whitelisted]);

  const visible = !!(settings && detected && !dismissed && !whitelisted);

  // Khoá scroll body khi popup overlay đang hiện.
  useEffect(() => {
    if (!visible) return;
    const layout = settings?.layout;
    const isOverlay = layout === "modal" || layout === "fullscreen";
    if (!isOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [visible, settings?.layout]);

  if (!visible || !settings) return null;

  const c = themeColors(settings);
  const handleRetry = async () => {
    const still = await detectAdblock(settings);
    if (!still) setDetected(false);
  };
  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
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
            width: 44, height: 44, borderRadius: 10,
            background: `linear-gradient(135deg, ${c.accent}, ${c.accent}88)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: c.bg,
          }}
        >
          M
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          id="mw-adblock-title"
          style={{
            margin: 0, fontSize: isBanner ? 15 : 19, lineHeight: 1.3,
            fontWeight: 700, color: c.accent,
          }}
        >
          {settings.title}
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: isBanner ? 13 : 14, lineHeight: 1.5, opacity: 0.9 }}>
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
          display: "flex", gap: 8, flexWrap: "wrap",
          marginTop: isBanner ? 0 : 16, width: isBanner ? "auto" : "100%",
        }}
      >
        {settings.show_retry && (
          <button
            onClick={handleRetry}
            style={{
              background: c.accent, color: c.bg, border: "none",
              padding: "10px 16px", borderRadius: 8, fontWeight: 600,
              cursor: "pointer", fontSize: 13, flex: isBanner ? "none" : 1,
            }}
          >
            {settings.button_text}
          </button>
        )}
        {settings.allow_dismiss && settings.mode !== "hard" && (
          <button
            onClick={handleDismiss}
            style={{
              background: "transparent", color: c.text, border: `1px solid ${c.text}33`,
              padding: "10px 16px", borderRadius: 8, fontWeight: 500,
              cursor: "pointer", fontSize: 13,
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
    return <div style={pos}>{card}</div>;
  }

  // Modal / fullscreen với overlay (hard hoặc dismiss mode).
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2147483000,
        background: `${c.overlay}${Math.round(settings.overlay_opacity * 255).toString(16).padStart(2, "0")}`,
        backdropFilter: settings.backdrop_blur > 0 ? `blur(${settings.backdrop_blur}px)` : undefined,
        WebkitBackdropFilter: settings.backdrop_blur > 0 ? `blur(${settings.backdrop_blur}px)` : undefined,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: settings.layout === "fullscreen" ? 0 : 20,
        overflow: "auto",
      }}
      onClick={(e) => {
        if (!isHard && settings.allow_dismiss && e.target === e.currentTarget) handleDismiss();
      }}
    >
      {card}
    </div>
  );
}