import { createFileRoute, redirect } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Loader2,
  Info,
  Gem,
  Flame,
  Bitcoin,
  Banknote,
  Clock,
  ShieldAlert,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  Database,
  Cpu,
  LineChart,
  Home,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  predictAssetPrice,
  PREDICTABLE_ASSETS,
  HORIZONS,
  type AssetSlug,
  type PredictionResult,
} from "@/lib/ai-predict.functions";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/du-doan-gia-ai`;
const TITLE = "Dự đoán giá vàng SJC, Bitcoin, xăng dầu bằng AI | MarketWatch";
const DESC =
  "AI dự đoán giá vàng SJC, vàng nhẫn 9999, Bitcoin (BTC), Ethereum, xăng RON 95, dầu Brent/WTI và USD/VND cho 24h, 7 ngày, 30 ngày tới. Miễn phí, dữ liệu thời gian thực.";

export const Route = createFileRoute("/du-doan-gia-ai")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/dang-nhap",
        search: { redirect: "/du-doan-gia-ai" } as never,
      });
    }
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "ai dự đoán giá vàng, ai dự đoán giá xăng, ai dự báo bitcoin, dự đoán giá vàng sjc, dự đoán giá dầu, dự báo usd vnd, ai predict crypto, dự đoán thị trường tài chính",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE + "/" },
            { "@type": "ListItem", position: 2, name: "AI dự đoán giá", item: URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "AI Dự Đoán Giá — MarketWatch",
          url: URL,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          inLanguage: "vi-VN",
          description: DESC,
          offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
        }),
      },
    ],
  }),
  component: AiPredictPage,
});

const CATEGORIES = Array.from(new Set(PREDICTABLE_ASSETS.map((a) => a.category)));

const CATEGORY_ICONS: Record<string, typeof Gem> = {
  "Kim loại quý": Gem,
  "Năng lượng": Flame,
  "Tiền điện tử": Bitcoin,
  "Ngoại tệ": Banknote,
};

function fmtPct(n: number) {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function AiPredictPage() {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [asset, setAsset] = useState<AssetSlug>(
    PREDICTABLE_ASSETS.find((a) => a.category === CATEGORIES[0])!.slug,
  );
  const [horizon, setHorizon] = useState<"24h" | "7d" | "30d">("24h");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [clock, setClock] = useState("--:--:--");
  const { user, loading: authLoading } = useAuth();
  const isAuthed = !!user;

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("vi-VN", {
          hour12: false,
          timeZone: "Asia/Ho_Chi_Minh",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const assetsInCategory = useMemo(
    () => PREDICTABLE_ASSETS.filter((a) => a.category === category),
    [category],
  );
  const activeMeta = PREDICTABLE_ASSETS.find((a) => a.slug === asset)!;
  const horizonMeta = HORIZONS.find((h) => h.value === horizon)!;

  const callPredict = useServerFn(predictAssetPrice);
  const mutation = useMutation({
    mutationFn: (vars: { asset: AssetSlug; horizon: "24h" | "7d" | "30d" }) =>
      callPredict({ data: vars }),
    onSuccess: (data) => setResult(data),
  });

  const onPredict = () => {
    if (!isAuthed) return;
    setResult(null);
    mutation.mutate({ asset, horizon });
  };

  // Reset result when the user changes selection
  useEffect(() => {
    setResult(null);
  }, [asset, horizon]);

  const horizonSub = (h: string) =>
    h === "24h" ? "Ngắn hạn" : h === "7d" ? "Trung hạn" : "Dài hạn";

  if (!authLoading && !isAuthed) {
    return (
      <div className="aip min-h-screen flex flex-col">
        <AipStyles />
        <Header />
        <main className="flex-1 relative">
          <div className="aip-bg-glow" />
          <div className="aip-bg-grid" />
          <div className="aip-bg-grain" />
          <div className="aip-shell aip-shell-narrow">
            <section className="aip-hero">
              <span className="aip-eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                Trí tuệ nhân tạo <span className="aip-mid">·</span> Đăng nhập
              </span>
              <h1 className="aip-h1">
                Đăng nhập để mở khóa <span className="aip-au">Dự đoán giá AI</span>
              </h1>
              <p className="aip-lead">
                Tính năng yêu cầu tài khoản miễn phí để bảo vệ hạn mức và chống lạm dụng.
                Đăng nhập hoặc tạo tài khoản chỉ mất 30 giây.
              </p>
              <div className="aip-hero-chips">
                <Link
                  to="/dang-nhap"
                  search={{ redirect: "/du-doan-gia-ai" } as never}
                  className="aip-btn"
                >
                  <Lock className="h-4 w-4" />
                  Đăng nhập
                </Link>
                <Link
                  to="/dang-ky"
                  search={{ redirect: "/du-doan-gia-ai" } as never}
                  className="aip-btn-ghost"
                >
                  Tạo tài khoản miễn phí
                </Link>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="aip min-h-screen flex flex-col">
      <AipStyles />
      <Header />
      <main className="flex-1 relative">
        <div className="aip-bg-glow" />
        <div className="aip-bg-grid" />
        <div className="aip-bg-grain" />

        <div className="aip-shell">
          {/* top bar */}
          <header className="aip-topbar">
            <nav className="aip-crumb">
              <Link to="/" className="aip-home" aria-label="Trang chủ">
                <Home className="h-4 w-4" />
              </Link>
              <ChevronRight className="aip-sep h-3.5 w-3.5" />
              <span className="aip-here">AI dự đoán giá</span>
            </nav>
            <div className="aip-live">
              <span className="aip-pill">
                <span className="aip-dot" /> Thị trường mở · <span className="aip-clock">{clock}</span>
              </span>
            </div>
          </header>

          {/* hero */}
          <section className="aip-hero">
            <span className="aip-eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Trí tuệ nhân tạo
            </span>
            <h1 className="aip-h1">
              AI dự đoán giá <span className="aip-au">vàng</span>, xăng dầu,{" "}
              <span className="aip-au">Bitcoin</span> &amp; ngoại tệ
            </h1>
            <p className="aip-lead">
              Chọn tài sản và khung thời gian — AI phân tích dữ liệu thị trường thời gian thực
              để đưa ra ước lượng xu hướng, biên độ&nbsp;% thay đổi và 3 kịch bản dự báo.
            </p>
            <p className="text-xs text-muted-foreground italic mt-3">
              Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.
            </p>
          </section>

          <div className="aip-rule" />

          {/* configurator */}
          <main className="aip-panel">
            {/* step 1 */}
            <section className="aip-step">
              <div className="aip-step-head">
                <div className="aip-step-title">
                  <span className="aip-step-num">1</span>
                  <h2>Chọn loại tài sản</h2>
                </div>
                <span className="aip-step-count">
                  {CATEGORIES.length} nhóm · {PREDICTABLE_ASSETS.length} tài sản
                </span>
              </div>

              <div className="aip-cats">
                {CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICONS[c] ?? Gem;
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCategory(c);
                        const first = PREDICTABLE_ASSETS.find((a) => a.category === c);
                        if (first) setAsset(first.slug);
                      }}
                      className={`aip-cat ${active ? "on" : ""}`}
                    >
                      <span className="aip-cat-ic">
                        <Icon className="h-4 w-4" />
                      </span>
                      {c}
                    </button>
                  );
                })}
              </div>

              <div className="aip-assets">
                {assetsInCategory.map((a, i) => {
                  const active = asset === a.slug;
                  const code = a.slug.toUpperCase().replace(/-/g, "/");
                  return (
                    <button
                      key={a.slug}
                      type="button"
                      onClick={() => setAsset(a.slug)}
                      className={`aip-asset ${active ? "on" : ""}`}
                      style={{ animationDelay: `${i * 45}ms` }}
                    >
                      <div className="aip-asset-top">
                        <div className="min-w-0">
                          <div className="aip-asset-name">{a.label}</div>
                          <div className="aip-asset-unit">
                            <span className="aip-code">{code}</span> · {a.unit}
                          </div>
                        </div>
                        <span className="aip-tick">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* step 2 */}
            <section className="aip-step">
              <div className="aip-step-head">
                <div className="aip-step-title">
                  <span className="aip-step-num">2</span>
                  <h2>Khung thời gian dự báo</h2>
                </div>
              </div>
              <div className="aip-frames">
                {HORIZONS.map((h) => {
                  const active = horizon === h.value;
                  return (
                    <button
                      key={h.value}
                      type="button"
                      onClick={() => setHorizon(h.value)}
                      className={`aip-frame ${active ? "on" : ""}`}
                    >
                      <span className="aip-frame-ic">
                        <Clock className="h-4 w-4" />
                      </span>
                      <span className="aip-frame-txt">
                        <b>{h.label}</b>
                        <span>{horizonSub(h.value)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* CTA */}
            <div className="aip-cta">
              <div className="aip-cta-info">
                <div className="aip-cta-lbl">Sẵn sàng phân tích</div>
                <div className="aip-cta-sel">
                  {activeMeta.label} <span className="aip-mid">·</span> {horizonMeta.label}
                </div>
              </div>
              <button
                type="button"
                className="aip-btn"
                disabled={mutation.isPending}
                onClick={onPredict}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang phân tích…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {result ? "Dự đoán lại" : "Dự đoán bằng AI"}
                  </>
                )}
              </button>
            </div>

            {/* result */}
            {(result || mutation.isError) && (
              <div className="aip-result open">
                {mutation.isError ? (
                  <div className="aip-err">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {(mutation.error as Error)?.message ||
                        "Đã có lỗi xảy ra, vui lòng thử lại."}
                    </span>
                  </div>
                ) : result ? (
                  <ResultBody result={result} />
                ) : null}
              </div>
            )}
          </main>

          {/* disclaimer */}
          <div className="aip-disclaimer">
            <span className="aip-disc-ic">
              <Info className="h-5 w-5" />
            </span>
            <div>
              <div className="aip-disc-lbl">Miễn trừ trách nhiệm</div>
              <p>
                Dự đoán do AI tạo ra dựa trên dữ liệu công khai và mô hình ngôn ngữ —{" "}
                <b>không phải</b> tư vấn tài chính, không đảm bảo độ chính xác. Thị trường có
                thể biến động bất thường; bạn tự chịu trách nhiệm với mọi quyết định đầu tư.
              </p>
            </div>
          </div>

          {/* how */}
          <section className="aip-how">
            <span className="aip-eyebrow">Cách hoạt động</span>
            <h2 className="aip-h2">AI dự đoán giá hoạt động thế nào?</h2>
            <p className="aip-how-body">
              Công cụ truy xuất dữ liệu giá <b>thời gian thực</b> của vàng SJC, vàng nhẫn,
              xăng dầu Petrolimex, dầu Brent/WTI, Bitcoin, Ethereum và các cặp tỷ giá ngoại
              tệ — sau đó gửi tới mô hình AI để phân tích xu hướng ngắn hạn. Mô hình đưa ra:
              hướng giá kỳ vọng, biên độ % thay đổi, mức độ tự tin, các động lực chính và
              rủi ro có thể đảo chiều dự báo, kèm 3 kịch bản tham khảo (lạc quan / cơ sở /
              bi quan).
            </p>

            <div className="aip-flow">
              {[
                {
                  n: "01",
                  Icon: Database,
                  title: "Thu thập dữ liệu",
                  text: "Giá thị trường được truy xuất trực tiếp và chuẩn hoá theo từng tài sản, đơn vị và khung thời gian.",
                },
                {
                  n: "02",
                  Icon: Cpu,
                  title: "Phân tích bằng AI",
                  text: "Mô hình đánh giá xu hướng, động lực và rủi ro đảo chiều để ước lượng hướng đi và biên độ giá.",
                },
                {
                  n: "03",
                  Icon: LineChart,
                  title: "3 kịch bản tham khảo",
                  text: "Kết quả trình bày kèm mức tin cậy và ba kịch bản lạc quan / cơ sở / bi quan để bạn cân nhắc.",
                },
              ].map((c) => (
                <div key={c.n} className="aip-flow-card">
                  <div className="aip-flow-n">{c.n}</div>
                  <div className="aip-flow-ic">
                    <c.Icon className="h-5 w-5" />
                  </div>
                  <h4>{c.title}</h4>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="aip-faq">
            <span className="aip-eyebrow">Câu hỏi thường gặp</span>
            <h2 className="aip-h2">FAQ</h2>
            <div className="aip-faq-list">
              {[
                {
                  q: "AI dự đoán giá có chính xác 100% không?",
                  a: "Không. AI chỉ đưa ra ước lượng xác suất dựa trên dữ liệu thị trường và bối cảnh hiện tại — mọi dự đoán chỉ mang tính tham khảo, không phải lời khuyên đầu tư.",
                },
                {
                  q: "Công cụ có hỗ trợ vàng SJC & xăng dầu Việt Nam không?",
                  a: "Có. Hỗ trợ vàng SJC, vàng nhẫn 9999, xăng RON 95-III, E5 RON 92, dầu Diesel cùng các tài sản quốc tế như Bitcoin, Ethereum, Brent/WTI và USD/VND.",
                },
                {
                  q: "Khung thời gian dự đoán là bao lâu?",
                  a: "Bạn có thể chọn 24 giờ, 7 ngày hoặc 30 ngày tới.",
                },
                {
                  q: "Tính năng AI có miễn phí không?",
                  a: "Có, hoàn toàn miễn phí cho người dùng MarketWatch.vn.",
                },
              ].map((it) => (
                <details key={it.q} className="aip-faq-item">
                  <summary>
                    <span>{it.q}</span>
                    <ChevronDown className="h-4 w-4" />
                  </summary>
                  <p>{it.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ResultBody({ result }: { result: PredictionResult }) {
  const meta = PREDICTABLE_ASSETS.find((a) => a.slug === result.asset)!;
  const horizonLabel = HORIZONS.find((h) => h.value === result.horizon)!.label;
  const low = result.expected_change_pct_low;
  const high = result.expected_change_pct_high;
  const mid = (low + high) / 2;
  const dir = result.direction;
  const dirUp = dir === "tăng";
  const dirDown = dir === "giảm";
  const confPct =
    result.confidence === "cao" ? 86 : result.confidence === "trung bình" ? 64 : 42;

  const DirIcon = dirUp ? TrendingUp : dirDown ? TrendingDown : Minus;
  const dirColor = dirUp ? "var(--aip-up)" : dirDown ? "var(--aip-down)" : "var(--aip-ink-3)";

  return (
    <>
      <div className="aip-res-head">
        <div className="aip-res-title">
          <span className="aip-res-tag">Phân tích AI</span>
          <h3>
            {meta.label} · {horizonLabel}
          </h3>
        </div>
        <div className="aip-res-conf">
          Độ tin cậy
          <b className="capitalize">{result.confidence}</b>
        </div>
      </div>

      <div className="aip-res-metrics">
        <div className="aip-metric">
          <div className="aip-metric-k">Hướng dự kiến</div>
          <div className="aip-metric-v">
            <DirIcon className="h-5 w-5" style={{ color: dirColor }} />
            <span style={{ color: dirColor }} className="capitalize">
              {dir}
            </span>
          </div>
        </div>
        <div className="aip-metric">
          <div className="aip-metric-k">Biên độ ước tính</div>
          <div className="aip-metric-v" style={{ color: dirColor }}>
            {fmtPct(low)} → {fmtPct(high)}
          </div>
        </div>
        <div className="aip-metric">
          <div className="aip-metric-k">Mức tin cậy mô hình</div>
          <div className="aip-metric-v">{confPct}%</div>
          <div className="aip-bar">
            <span style={{ width: `${confPct}%` }} />
          </div>
        </div>
      </div>

      <div>
        <div className="aip-eyebrow aip-section-eyebrow">Tổng quan</div>
        <p className="aip-summary">{result.summary}</p>
      </div>

      <div className="aip-scenarios">
        <div className="aip-scn optimistic">
          <div className="aip-scn-tag">
            <TrendingUp className="h-3.5 w-3.5" /> Lạc quan
          </div>
          <div className="aip-scn-pct" style={{ color: "var(--aip-up)" }}>
            {fmtPct(high)}
          </div>
          <p className="aip-scn-note">{result.scenarios.bullish}</p>
        </div>
        <div className="aip-scn base">
          <div className="aip-scn-tag">
            <Minus className="h-3.5 w-3.5" /> Cơ sở
          </div>
          <div className="aip-scn-pct">{fmtPct(mid)}</div>
          <p className="aip-scn-note">{result.scenarios.base}</p>
        </div>
        <div className="aip-scn pessimistic">
          <div className="aip-scn-tag">
            <TrendingDown className="h-3.5 w-3.5" /> Bi quan
          </div>
          <div className="aip-scn-pct" style={{ color: "var(--aip-down)" }}>
            {fmtPct(low)}
          </div>
          <p className="aip-scn-note">{result.scenarios.bearish}</p>
        </div>
      </div>

      <div className="aip-twocol">
        <div>
          <div className="aip-eyebrow aip-section-eyebrow">
            <TrendingUp className="h-3.5 w-3.5" /> Động lực chính
          </div>
          <ul className="aip-list">
            {result.drivers.map((d, i) => (
              <li key={i}>
                <span className="aip-list-n">0{i + 1}</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="aip-eyebrow aip-section-eyebrow aip-amber">
            <ShieldAlert className="h-3.5 w-3.5" /> Rủi ro đảo chiều
          </div>
          <ul className="aip-list">
            {result.risks.map((r, i) => (
              <li key={i}>
                <AlertTriangle className="h-3.5 w-3.5 aip-amber-ic" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {result.context && (
        <details className="aip-context">
          <summary>
            <span>Dữ liệu AI đã tham khảo</span>
            <ChevronDown className="h-4 w-4" />
          </summary>
          <pre>{result.context}</pre>
        </details>
      )}

      <div className="aip-res-foot">
        <Info className="h-3.5 w-3.5" />
        Mô hình: {result.model} · Tạo lúc{" "}
        {new Date(result.generated_at).toLocaleString("vi-VN")}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Scoped page styles — all selectors prefixed with `.aip`.
 * Mirrors the supplied design (dark warm-black + antique gold).
 * ───────────────────────────────────────────────────────────── */
function AipStyles() {
  return (
    <style>{`
      .aip {
        --aip-bg:#0a0807;
        --aip-bg-2:#0e0b09;
        --aip-ink:#f6f1e7;
        --aip-ink-2:#c3baa9;
        --aip-ink-3:#8a8273;
        --aip-ink-4:#5d564b;
        --aip-gold:#cba75f;
        --aip-gold-bright:#e7cd8c;
        --aip-gold-soft:#d8bc78;
        --aip-up:#7cc492;
        --aip-down:#db8278;
        --aip-line:rgba(203,167,95,.14);
        --aip-line-soft:rgba(246,241,231,.07);
        --aip-panel:rgba(255,255,255,.018);
        --aip-panel-2:rgba(255,255,255,.028);
        --aip-panel-hi:rgba(203,167,95,.06);
        --aip-r-lg:22px;
        --aip-r-md:15px;
        --aip-shadow-deep:0 40px 90px -40px rgba(0,0,0,.9);
        --aip-gold-grad:linear-gradient(135deg,#f0d999 0%,#cba75f 42%,#a07e36 100%);
        background:var(--aip-bg);
        color:var(--aip-ink);
        font-family:'Be Vietnam Pro', system-ui, sans-serif;
        line-height:1.6;
      }
      .aip main { background:var(--aip-bg); }
      .aip .aip-bg-glow {
        position:absolute; inset:0; z-index:0; pointer-events:none;
        background:
          radial-gradient(900px 520px at 18% -8%, rgba(203,167,95,.16), transparent 60%),
          radial-gradient(700px 600px at 100% 4%, rgba(160,126,54,.08), transparent 55%),
          linear-gradient(180deg, var(--aip-bg) 0%, var(--aip-bg-2) 55%, var(--aip-bg) 100%);
      }
      .aip .aip-bg-grid {
        position:absolute; inset:0; z-index:0; pointer-events:none; opacity:.5;
        background-image:
          linear-gradient(to right, rgba(246,241,231,.022) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(246,241,231,.022) 1px, transparent 1px);
        background-size:64px 64px;
        -webkit-mask-image:radial-gradient(circle at 30% 0%, #000 0%, transparent 70%);
                mask-image:radial-gradient(circle at 30% 0%, #000 0%, transparent 70%);
      }
      .aip .aip-bg-grain {
        position:absolute; inset:0; z-index:0; pointer-events:none; opacity:.045; mix-blend-mode:overlay;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      }
      .aip .aip-shell { position:relative; z-index:1; max-width:1160px; margin:0 auto; padding:0 28px 90px; }
      .aip .aip-shell-narrow { max-width:780px; padding-top:40px; }

      /* topbar */
      .aip .aip-topbar { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:26px 0 8px; }
      .aip .aip-crumb { display:flex; align-items:center; gap:11px; font-size:.82rem; color:var(--aip-ink-3); }
      .aip .aip-home { width:31px; height:31px; border-radius:9px; display:grid; place-items:center; border:1px solid var(--aip-line); background:var(--aip-panel); color:var(--aip-gold-soft); transition:.25s; }
      .aip .aip-home:hover { border-color:rgba(203,167,95,.35); background:var(--aip-panel-hi); }
      .aip .aip-sep { color:var(--aip-ink-4); }
      .aip .aip-here { color:var(--aip-ink-2); font-weight:500; }
      .aip .aip-live { display:flex; align-items:center; gap:14px; font-size:.7rem; letter-spacing:.04em; color:var(--aip-ink-3); }
      .aip .aip-pill { display:inline-flex; align-items:center; gap:8px; padding:7px 13px; border-radius:999px; border:1px solid var(--aip-line); background:var(--aip-panel); font-variant-numeric:tabular-nums; }
      .aip .aip-dot { width:7px; height:7px; border-radius:50%; background:var(--aip-up); box-shadow:0 0 0 0 rgba(124,196,146,.6); animation:aip-pulse 2.4s infinite; }
      @keyframes aip-pulse { 0%{box-shadow:0 0 0 0 rgba(124,196,146,.55)} 70%{box-shadow:0 0 0 7px rgba(124,196,146,0)} 100%{box-shadow:0 0 0 0 rgba(124,196,146,0)} }
      .aip .aip-clock { color:var(--aip-ink-2); }

      /* hero */
      .aip .aip-hero { padding:54px 0 40px; max-width:880px; }
      .aip .aip-eyebrow { display:inline-flex; align-items:center; gap:10px; font-size:.72rem; font-weight:500; letter-spacing:.26em; text-transform:uppercase; color:var(--aip-gold-soft); }
      .aip .aip-mid { color:var(--aip-ink-4); }
      .aip .aip-h1 { font-weight:700; font-size:clamp(2.4rem, 6vw, 4.4rem); line-height:1.05; letter-spacing:-.022em; margin:22px 0 0; color:var(--aip-ink); }
      .aip .aip-au { background:var(--aip-gold-grad); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; font-weight:700; }
      .aip .aip-lead { margin-top:24px; max-width:660px; font-size:1.05rem; line-height:1.72; color:var(--aip-ink-2); }
      .aip .aip-lead b { color:var(--aip-ink); font-weight:600; }
      .aip .aip-hero-chips { display:flex; flex-wrap:wrap; gap:10px; margin-top:30px; }
      .aip .aip-chip { display:inline-flex; align-items:center; gap:9px; padding:9px 15px; border-radius:999px; border:1px solid var(--aip-line); background:var(--aip-panel); font-size:.74rem; color:var(--aip-ink-2); }
      .aip .aip-chip svg { color:var(--aip-gold-soft); }
      .aip .aip-rule { height:1px; background:linear-gradient(90deg, var(--aip-line) 0%, transparent 80%); margin:8px 0 0; }

      /* panel */
      .aip .aip-panel { position:relative; margin-top:40px; border:1px solid var(--aip-line); border-radius:var(--aip-r-lg); background:linear-gradient(180deg, rgba(203,167,95,.04), transparent 26%), var(--aip-bg-2); box-shadow:var(--aip-shadow-deep); overflow:hidden; }
      .aip .aip-step { padding:34px 36px; }
      .aip .aip-step + .aip-step { border-top:1px solid var(--aip-line-soft); }
      .aip .aip-step-head { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:26px; }
      .aip .aip-step-title { display:flex; align-items:center; gap:15px; }
      .aip .aip-step-num { flex:none; width:30px; height:30px; border-radius:9px; display:grid; place-items:center; font-size:.82rem; font-weight:600; color:var(--aip-gold-bright); border:1px solid rgba(203,167,95,.35); background:radial-gradient(circle at 30% 25%, rgba(203,167,95,.22), rgba(203,167,95,.05)); font-variant-numeric:tabular-nums; }
      .aip .aip-step-title h2 { font-weight:600; font-size:1.5rem; letter-spacing:-.012em; color:var(--aip-ink); }
      .aip .aip-step-count { font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; color:var(--aip-ink-3); }

      /* cats */
      .aip .aip-cats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
      .aip .aip-cat { display:flex; align-items:center; gap:12px; padding:15px 17px; cursor:pointer; text-align:left; border:1px solid var(--aip-line); border-radius:var(--aip-r-md); background:var(--aip-panel); color:var(--aip-ink-2); font-size:.96rem; font-weight:500; transition:transform .2s ease, border-color .25s, background .25s, color .25s, box-shadow .25s; }
      .aip .aip-cat-ic { width:30px; height:30px; flex:none; display:grid; place-items:center; border-radius:9px; color:var(--aip-ink-3); border:1px solid var(--aip-line-soft); transition:.25s; }
      .aip .aip-cat:hover { transform:translateY(-2px); border-color:rgba(203,167,95,.3); color:var(--aip-ink); }
      .aip .aip-cat:hover .aip-cat-ic { color:var(--aip-gold-soft); }
      .aip .aip-cat.on { color:var(--aip-ink); border-color:rgba(203,167,95,.55); background:linear-gradient(180deg, rgba(203,167,95,.12), rgba(203,167,95,.03)); box-shadow:inset 0 1px 0 rgba(231,205,140,.18), 0 10px 30px -18px rgba(203,167,95,.5); }
      .aip .aip-cat.on .aip-cat-ic { color:var(--aip-gold-bright); border-color:rgba(203,167,95,.4); background:rgba(203,167,95,.1); }

      /* assets */
      .aip .aip-assets { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:14px; }
      .aip .aip-asset { position:relative; cursor:pointer; text-align:left; padding:16px 17px 15px; border:1px solid var(--aip-line); border-radius:var(--aip-r-md); background:var(--aip-panel); transition:transform .2s ease, border-color .25s, background .25s, box-shadow .25s; animation:aip-pop .4s ease both; }
      @keyframes aip-pop { from{ opacity:0; transform:translateY(8px) scale(.985);} to{ opacity:1; transform:translateY(0) scale(1);} }
      .aip .aip-asset:hover { transform:translateY(-2px); border-color:rgba(203,167,95,.32); background:var(--aip-panel-2); }
      .aip .aip-asset.on { border-color:rgba(203,167,95,.6); background:linear-gradient(180deg, rgba(203,167,95,.11), rgba(203,167,95,.025)); box-shadow:inset 0 1px 0 rgba(231,205,140,.2), 0 14px 34px -20px rgba(203,167,95,.55); }
      .aip .aip-asset-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
      .aip .aip-asset-name { font-weight:600; font-size:1rem; color:var(--aip-ink); letter-spacing:-.01em; }
      .aip .aip-asset-unit { margin-top:5px; font-size:.7rem; letter-spacing:.02em; color:var(--aip-ink-3); font-variant-numeric:tabular-nums; }
      .aip .aip-code { color:var(--aip-gold-soft); }
      .aip .aip-tick { flex:none; width:21px; height:21px; border-radius:7px; display:grid; place-items:center; border:1px solid var(--aip-line); color:var(--aip-ink-4); transition:.25s; transform:scale(.85); }
      .aip .aip-asset.on .aip-tick { border-color:rgba(203,167,95,.5); background:var(--aip-gold-grad); color:#1a1305; transform:scale(1); box-shadow:0 4px 12px -4px rgba(203,167,95,.7); }

      /* frames */
      .aip .aip-frames { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
      .aip .aip-frame { cursor:pointer; text-align:left; padding:18px; border:1px solid var(--aip-line); border-radius:var(--aip-r-md); background:var(--aip-panel); transition:transform .2s ease, border-color .25s, background .25s, box-shadow .25s; display:flex; gap:14px; align-items:center; }
      .aip .aip-frame-ic { width:34px; height:34px; flex:none; border-radius:10px; display:grid; place-items:center; border:1px solid var(--aip-line-soft); color:var(--aip-ink-3); transition:.25s; }
      .aip .aip-frame-txt b { display:block; font-weight:600; font-size:1rem; color:var(--aip-ink); letter-spacing:-.01em; }
      .aip .aip-frame-txt span { font-size:.68rem; letter-spacing:.06em; text-transform:uppercase; color:var(--aip-ink-3); }
      .aip .aip-frame:hover { transform:translateY(-2px); border-color:rgba(203,167,95,.3); }
      .aip .aip-frame:hover .aip-frame-ic { color:var(--aip-gold-soft); }
      .aip .aip-frame.on { border-color:rgba(203,167,95,.55); background:linear-gradient(180deg, rgba(203,167,95,.12), rgba(203,167,95,.03)); box-shadow:inset 0 1px 0 rgba(231,205,140,.18), 0 12px 32px -20px rgba(203,167,95,.5); }
      .aip .aip-frame.on .aip-frame-ic { color:var(--aip-gold-bright); border-color:rgba(203,167,95,.4); background:rgba(203,167,95,.1); }

      /* cta */
      .aip .aip-cta { display:flex; align-items:center; justify-content:space-between; gap:22px; padding:22px 28px 22px 32px; border-top:1px solid var(--aip-line); background:linear-gradient(180deg, rgba(203,167,95,.05), transparent); }
      .aip .aip-cta-info .aip-cta-lbl { font-size:.7rem; letter-spacing:.22em; text-transform:uppercase; color:var(--aip-ink-3); }
      .aip .aip-cta-info .aip-cta-sel { margin-top:6px; font-size:1.25rem; font-weight:600; color:var(--aip-ink); letter-spacing:-.012em; }

      .aip .aip-btn { position:relative; overflow:hidden; display:inline-flex; align-items:center; gap:11px; padding:16px 26px; border:none; border-radius:12px; cursor:pointer; font-weight:600; font-size:.86rem; letter-spacing:.12em; text-transform:uppercase; color:#231803; background:var(--aip-gold-grad); box-shadow:0 14px 34px -14px rgba(203,167,95,.85), inset 0 1px 0 rgba(255,255,255,.4); transition:transform .2s ease, box-shadow .25s, filter .2s; }
      .aip .aip-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 20px 44px -14px rgba(203,167,95,.95); filter:brightness(1.04); }
      .aip .aip-btn:disabled { opacity:.7; cursor:wait; }
      .aip .aip-btn-ghost { display:inline-flex; align-items:center; gap:10px; padding:14px 22px; border-radius:12px; border:1px solid rgba(203,167,95,.5); color:var(--aip-gold-soft); font-weight:600; font-size:.82rem; letter-spacing:.12em; text-transform:uppercase; transition:background .2s; }
      .aip .aip-btn-ghost:hover { background:rgba(203,167,95,.1); }

      /* result */
      .aip .aip-result { border-top:1px solid var(--aip-line); padding:32px 36px 38px; display:flex; flex-direction:column; gap:24px; animation:aip-rise .5s ease both; }
      @keyframes aip-rise { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:translateY(0);} }
      .aip .aip-res-head { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
      .aip .aip-res-title { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
      .aip .aip-res-tag { font-size:.66rem; letter-spacing:.18em; text-transform:uppercase; color:var(--aip-gold-bright); padding:5px 11px; border-radius:999px; border:1px solid rgba(203,167,95,.4); background:rgba(203,167,95,.08); }
      .aip .aip-res-title h3 { font-weight:600; font-size:1.35rem; color:var(--aip-ink); letter-spacing:-.012em; }
      .aip .aip-res-conf { text-align:right; font-size:.72rem; color:var(--aip-ink-3); letter-spacing:.04em; }
      .aip .aip-res-conf b { color:var(--aip-ink); font-size:1.05rem; display:block; }
      .aip .aip-res-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
      .aip .aip-metric { padding:16px 18px; border:1px solid var(--aip-line); border-radius:var(--aip-r-md); background:var(--aip-panel); }
      .aip .aip-metric-k { font-size:.66rem; letter-spacing:.14em; text-transform:uppercase; color:var(--aip-ink-3); }
      .aip .aip-metric-v { margin-top:8px; font-size:1.25rem; font-weight:600; color:var(--aip-ink); display:flex; align-items:center; gap:8px; font-variant-numeric:tabular-nums; }
      .aip .aip-bar { margin-top:10px; height:6px; border-radius:99px; background:rgba(246,241,231,.08); overflow:hidden; }
      .aip .aip-bar span { display:block; height:100%; border-radius:99px; background:var(--aip-gold-grad); width:0; transition:width 1s ease .15s; }

      .aip .aip-section-eyebrow { color:var(--aip-gold); margin-bottom:12px; display:inline-flex; align-items:center; gap:8px; }
      .aip .aip-amber { color:#e0a458; }
      .aip .aip-amber-ic { color:#e0a458; flex:none; margin-top:4px; }
      .aip .aip-summary { font-size:1rem; line-height:1.72; color:var(--aip-ink-2); }

      .aip .aip-scenarios { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
      .aip .aip-scn { padding:17px 18px; border:1px solid var(--aip-line); border-radius:var(--aip-r-md); background:var(--aip-panel); border-top:2px solid var(--aip-gold); }
      .aip .aip-scn.optimistic { border-top-color:var(--aip-up); }
      .aip .aip-scn.base { border-top-color:var(--aip-gold); }
      .aip .aip-scn.pessimistic { border-top-color:var(--aip-down); }
      .aip .aip-scn-tag { font-size:.66rem; letter-spacing:.14em; text-transform:uppercase; color:var(--aip-ink-3); display:flex; align-items:center; gap:7px; }
      .aip .aip-scn.optimistic .aip-scn-tag { color:var(--aip-up); }
      .aip .aip-scn.pessimistic .aip-scn-tag { color:var(--aip-down); }
      .aip .aip-scn.base .aip-scn-tag { color:var(--aip-gold-soft); }
      .aip .aip-scn-pct { margin-top:11px; font-weight:600; font-size:1.5rem; color:var(--aip-ink); font-variant-numeric:tabular-nums; }
      .aip .aip-scn-note { margin-top:7px; font-size:.85rem; color:var(--aip-ink-3); line-height:1.55; }

      .aip .aip-twocol { display:grid; grid-template-columns:repeat(2,1fr); gap:24px; }
      .aip .aip-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; font-size:.92rem; color:var(--aip-ink-2); line-height:1.6; }
      .aip .aip-list li { display:flex; gap:10px; }
      .aip .aip-list-n { color:var(--aip-gold); font-size:.78rem; font-variant-numeric:tabular-nums; flex:none; margin-top:2px; }

      .aip .aip-context { border-top:1px solid var(--aip-line-soft); padding-top:16px; }
      .aip .aip-context summary { display:flex; align-items:center; justify-content:space-between; cursor:pointer; list-style:none; font-size:.74rem; letter-spacing:.18em; text-transform:uppercase; color:var(--aip-ink-3); }
      .aip .aip-context summary::-webkit-details-marker { display:none; }
      .aip .aip-context[open] summary svg { transform:rotate(180deg); }
      .aip .aip-context summary svg { transition:transform .2s; }
      .aip .aip-context pre { margin-top:12px; white-space:pre-wrap; font-size:.74rem; color:var(--aip-ink-3); background:rgba(255,255,255,.02); border:1px solid var(--aip-line-soft); border-radius:10px; padding:14px; line-height:1.55; }

      .aip .aip-res-foot { font-size:.74rem; color:var(--aip-ink-4); display:flex; align-items:center; gap:8px; }
      .aip .aip-err { display:flex; align-items:center; gap:10px; color:var(--aip-down); padding:14px 16px; border:1px solid rgba(219,130,120,.3); background:rgba(219,130,120,.06); border-radius:var(--aip-r-md); font-size:.9rem; }

      /* disclaimer */
      .aip .aip-disclaimer { margin-top:30px; display:flex; gap:16px; border:1px solid var(--aip-line); border-left:3px solid var(--aip-gold); border-radius:var(--aip-r-md); padding:20px 24px; background:linear-gradient(90deg, rgba(203,167,95,.05), transparent 60%); }
      .aip .aip-disc-ic { flex:none; color:var(--aip-gold-soft); margin-top:2px; }
      .aip .aip-disc-lbl { font-size:.7rem; letter-spacing:.18em; text-transform:uppercase; color:var(--aip-gold-soft); margin-bottom:7px; }
      .aip .aip-disclaimer p { font-size:.92rem; line-height:1.65; color:var(--aip-ink-2); }
      .aip .aip-disclaimer b { color:var(--aip-ink); font-weight:600; }

      /* how */
      .aip .aip-how { padding:74px 0 30px; }
      .aip .aip-h2 { font-weight:600; font-size:clamp(1.8rem,3.6vw,2.4rem); letter-spacing:-.018em; color:var(--aip-ink); margin:18px 0 28px; max-width:680px; }
      .aip .aip-how-body { max-width:720px; font-size:1rem; line-height:1.78; color:var(--aip-ink-2); }
      .aip .aip-how-body b { color:var(--aip-ink); font-weight:600; }
      .aip .aip-flow { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:38px; }
      .aip .aip-flow-card { position:relative; padding:24px 22px; border:1px solid var(--aip-line); border-radius:var(--aip-r-md); background:var(--aip-panel); }
      .aip .aip-flow-n { font-size:.72rem; color:var(--aip-gold-soft); letter-spacing:.12em; font-variant-numeric:tabular-nums; }
      .aip .aip-flow-ic { width:40px; height:40px; border-radius:11px; display:grid; place-items:center; margin:14px 0 16px; border:1px solid var(--aip-line); color:var(--aip-gold-bright); background:rgba(203,167,95,.06); }
      .aip .aip-flow-card h4 { font-weight:600; font-size:1.1rem; color:var(--aip-ink); margin-bottom:8px; letter-spacing:-.012em; }
      .aip .aip-flow-card p { font-size:.9rem; line-height:1.6; color:var(--aip-ink-3); }

      /* faq */
      .aip .aip-faq { padding:30px 0 60px; }
      .aip .aip-faq-list { border-top:1px solid var(--aip-line-soft); border-bottom:1px solid var(--aip-line-soft); }
      .aip .aip-faq-item { border-bottom:1px solid var(--aip-line-soft); padding:18px 0; }
      .aip .aip-faq-item:last-child { border-bottom:none; }
      .aip .aip-faq-item summary { display:flex; align-items:center; justify-content:space-between; cursor:pointer; list-style:none; gap:16px; font-weight:500; color:var(--aip-ink); font-size:1rem; }
      .aip .aip-faq-item summary::-webkit-details-marker { display:none; }
      .aip .aip-faq-item summary svg { color:var(--aip-ink-3); transition:transform .2s; flex:none; }
      .aip .aip-faq-item[open] summary svg { transform:rotate(180deg); }
      .aip .aip-faq-item p { margin-top:12px; font-size:.92rem; color:var(--aip-ink-3); line-height:1.65; }

      /* responsive */
      @media (max-width:920px) {
        .aip .aip-cats { grid-template-columns:repeat(2,1fr); }
        .aip .aip-assets { grid-template-columns:repeat(2,1fr); }
        .aip .aip-res-metrics, .aip .aip-scenarios, .aip .aip-flow, .aip .aip-twocol { grid-template-columns:1fr; }
      }
      @media (max-width:680px) {
        .aip .aip-shell { padding:0 18px 60px; }
        .aip .aip-step { padding:26px 20px; }
        .aip .aip-cta { flex-direction:column; align-items:stretch; padding:22px 20px; }
        .aip .aip-btn { justify-content:center; }
        .aip .aip-frames { grid-template-columns:1fr; }
        .aip .aip-result { padding:26px 20px 32px; }
        .aip .aip-disclaimer { flex-direction:column; gap:10px; }
        .aip .aip-live { display:none; }
      }
      @media (max-width:430px) {
        .aip .aip-cats, .aip .aip-assets { grid-template-columns:1fr; }
      }
    `}</style>
  );
}
