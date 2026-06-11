import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { fmtVND, fmtPct } from "@/lib/format";

/**
 * /embed/gia — Embeddable price widget for blogs / external sites.
 *
 * Query params:
 *   - assets:   comma-separated codes from { sjc, btc, eth, usd, eur }
 *   - theme:    "light" | "dark" (default: dark)
 *   - compact:  "1" to hide the footer brand row
 *
 * Designed to render with NO Header/Footer, transparent body, and to be
 * dropped into an <iframe>. The host can pass the `theme` to match their own
 * page background. Data is fetched from /api/public/widget-snapshot which
 * already CDN-caches for 60s.
 */

const TITLE = "Bảng giá MarketWatch — Widget nhúng";

export const Route = createFileRoute("/embed/gia")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "robots", content: "noindex" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: EmbedPrices,
});

interface WidgetItem {
  code: string;
  name: string;
  price: number;
  unit: string;
  changePct: number | null;
}

const CODE_ALIASES: Record<string, string[]> = {
  sjc: ["SJC"],
  btc: ["BTC"],
  eth: ["ETH"],
  usd: ["USD/VND", "USD"],
  eur: ["EUR/VND", "EUR"],
};

function EmbedPrices() {
  const [items, setItems] = useState<WidgetItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const { allowed, theme, compact } = useMemo(() => {
    if (typeof window === "undefined") {
      return { allowed: null as string[] | null, theme: "dark", compact: false };
    }
    const sp = new URLSearchParams(window.location.search);
    const assets = sp.get("assets");
    const allowedKeys = assets
      ? assets.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : null;
    return {
      allowed: allowedKeys,
      theme: sp.get("theme") === "light" ? "light" : "dark",
      compact: sp.get("compact") === "1",
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/public/widget-snapshot", {
          headers: { accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (cancelled) return;
        setItems(Array.isArray(j?.items) ? j.items : []);
        setUpdatedAt(typeof j?.updatedAt === "string" ? j.updatedAt : null);
        setErr(null);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Lỗi tải dữ liệu");
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (!allowed || allowed.length === 0) return items;
    const wanted = new Set(allowed.flatMap((k) => CODE_ALIASES[k] ?? [k.toUpperCase()]));
    return items.filter((i) => wanted.has(i.code));
  }, [items, allowed]);

  const isDark = theme === "dark";
  const colors = isDark
    ? {
        bg: "#0b0d10",
        card: "#15181d",
        border: "#26292e",
        text: "#e8eaed",
        muted: "#8b8f96",
        up: "#10b981",
        down: "#f43f5e",
      }
    : {
        bg: "#ffffff",
        card: "#fafafa",
        border: "#e5e7eb",
        text: "#0f172a",
        muted: "#64748b",
        up: "#059669",
        down: "#e11d48",
      };

  return (
    <div
      style={{
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: colors.bg,
        color: colors.text,
        minHeight: "100vh",
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      {err && (
        <div style={{ color: colors.down, fontSize: 12, padding: 12 }}>
          Lỗi: {err}
        </div>
      )}
      {!filtered ? (
        <div style={{ color: colors.muted, fontSize: 13, padding: 12 }}>
          Đang tải dữ liệu…
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          {filtered.map((i) => {
            const isUp = (i.changePct ?? 0) >= 0;
            const color = i.changePct == null ? colors.muted : isUp ? colors.up : colors.down;
            const display =
              i.unit === "VND" || i.unit === "VND/lượng"
                ? fmtVND(i.price)
                : `$${i.price.toLocaleString("en-US", { maximumFractionDigits: i.price < 10 ? 4 : 2 })}`;
            return (
              <div
                key={i.code}
                style={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: 1, color: colors.muted, textTransform: "uppercase" }}>
                  {i.code}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                  {display}
                </div>
                <div style={{ fontSize: 11, marginTop: 2, color, fontVariantNumeric: "tabular-nums" }}>
                  {i.changePct == null ? "—" : `${isUp ? "▲" : "▼"} ${fmtPct(i.changePct)}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!compact && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 10,
            color: colors.muted,
          }}
        >
          <a
            href="https://marketwatch.vn"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.muted, textDecoration: "none", fontWeight: 600, letterSpacing: 1 }}
          >
            MARKETWATCH.VN
          </a>
          {updatedAt && (
            <span>Cập nhật: {new Date(updatedAt).toLocaleTimeString("vi-VN")}</span>
          )}
        </div>
      )}
    </div>
  );
}