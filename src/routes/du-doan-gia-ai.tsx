import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  predictAssetPrice,
  PREDICTABLE_ASSETS,
  HORIZONS,
  type AssetSlug,
  type PredictionResult,
} from "@/lib/ai-predict.functions";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/du-doan-gia-ai`;
const TITLE = "AI Dự Đoán Giá Vàng, Xăng Dầu, Bitcoin & Ngoại Tệ — MarketWatch";
const DESC =
  "Công cụ AI dự đoán xu hướng giá vàng SJC, vàng nhẫn, xăng RON 95, dầu Brent/WTI, Bitcoin, Ethereum, USD/VND và nhiều tài sản khác trong 24h, 7 ngày và 30 ngày tới — dựa trên dữ liệu thị trường thời gian thực.";

export const Route = createFileRoute("/du-doan-gia-ai")({
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
      { name: "robots", content: "index, follow, max-image-preview:large" },
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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "AI dự đoán giá có chính xác 100% không?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Không. AI chỉ đưa ra ước lượng xác suất dựa trên dữ liệu thị trường và bối cảnh hiện tại. Mọi dự đoán đều chỉ mang tính tham khảo, không phải lời khuyên đầu tư.",
              },
            },
            {
              "@type": "Question",
              name: "Công cụ AI có hỗ trợ dự đoán vàng SJC và xăng dầu Việt Nam không?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Có. Công cụ hỗ trợ dự đoán vàng SJC, vàng nhẫn 9999, xăng RON 95-III, E5 RON 92, dầu Diesel cùng với các tài sản quốc tế như Bitcoin, Ethereum, dầu Brent/WTI và tỷ giá USD/VND.",
              },
            },
            {
              "@type": "Question",
              name: "Khung thời gian dự đoán là bao lâu?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Bạn có thể chọn dự đoán cho 24 giờ, 7 ngày hoặc 30 ngày tới.",
              },
            },
            {
              "@type": "Question",
              name: "Tính năng AI dự đoán giá có miễn phí không?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Có. Tính năng hoàn toàn miễn phí cho người dùng MarketWatch.vn.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: AiPredictPage,
});

const CATEGORIES = Array.from(new Set(PREDICTABLE_ASSETS.map((a) => a.category)));

function dirIcon(d: string) {
  if (d === "tăng") return <TrendingUp className="h-5 w-5 text-emerald-500" />;
  if (d === "giảm") return <TrendingDown className="h-5 w-5 text-rose-500" />;
  return <Minus className="h-5 w-5 text-muted-foreground" />;
}
function dirColor(d: string) {
  if (d === "tăng") return "text-emerald-600 dark:text-emerald-400";
  if (d === "giảm") return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}
function confidenceVariant(c: string): "default" | "secondary" | "outline" {
  if (c === "cao") return "default";
  if (c === "trung bình") return "secondary";
  return "outline";
}

function AiPredictPage() {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [asset, setAsset] = useState<AssetSlug>(
    PREDICTABLE_ASSETS.find((a) => a.category === CATEGORIES[0])!.slug,
  );
  const [horizon, setHorizon] = useState<"24h" | "7d" | "30d">("24h");
  const [result, setResult] = useState<PredictionResult | null>(null);

  const assetsInCategory = useMemo(
    () => PREDICTABLE_ASSETS.filter((a) => a.category === category),
    [category],
  );
  const activeMeta = PREDICTABLE_ASSETS.find((a) => a.slug === asset)!;

  const callPredict = useServerFn(predictAssetPrice);
  const mutation = useMutation({
    mutationFn: (vars: { asset: AssetSlug; horizon: "24h" | "7d" | "30d" }) =>
      callPredict({ data: vars }),
    onSuccess: (data) => setResult(data),
  });

  const onPredict = () => mutation.mutate({ asset, horizon });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <Breadcrumbs />

          <header className="mt-4 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Lovable AI · Tham khảo
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              AI dự đoán giá vàng, xăng dầu, Bitcoin & ngoại tệ
            </h1>
            <p className="mt-3 text-muted-foreground max-w-3xl">
              Chọn tài sản và khung thời gian, AI sẽ phân tích dữ liệu thị trường thời gian thực để
              đưa ra ước lượng xu hướng, biên độ % thay đổi và các kịch bản tham khảo. Kết quả{" "}
              <strong>không phải lời khuyên đầu tư</strong>.
            </p>
          </header>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Chọn tài sản & khung thời gian</CardTitle>
              <CardDescription>
                Kim loại quý, năng lượng, tiền điện tử và ngoại tệ — tất cả trong một công cụ.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Tabs
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  const first = PREDICTABLE_ASSETS.find((a) => a.category === v);
                  if (first) setAsset(first.slug);
                }}
              >
                <TabsList className="flex flex-wrap h-auto">
                  {CATEGORIES.map((c) => (
                    <TabsTrigger key={c} value={c}>
                      {c}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {CATEGORIES.map((c) => (
                  <TabsContent key={c} value={c} className="mt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {assetsInCategory.map((a) => (
                        <button
                          key={a.slug}
                          type="button"
                          onClick={() => setAsset(a.slug)}
                          className={`text-left rounded-lg border p-3 transition-colors hover:bg-accent ${
                            asset === a.slug
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border"
                          }`}
                        >
                          <div className="font-medium text-sm">{a.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">{a.unit}</div>
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              <div>
                <div className="text-sm font-medium mb-2">Khung thời gian</div>
                <div className="flex flex-wrap gap-2">
                  {HORIZONS.map((h) => (
                    <Button
                      key={h.value}
                      type="button"
                      variant={horizon === h.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHorizon(h.value)}
                    >
                      {h.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Đã chọn:{" "}
                  <span className="font-medium text-foreground">{activeMeta.label}</span> · khung{" "}
                  <span className="font-medium text-foreground">
                    {HORIZONS.find((h) => h.value === horizon)!.label}
                  </span>
                </div>
                <Button onClick={onPredict} disabled={mutation.isPending} size="lg">
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang phân tích…
                    </>
                  ) : result ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Dự đoán lại
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Dự đoán bằng AI
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {mutation.isError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {(mutation.error as Error)?.message ?? "Đã có lỗi xảy ra, vui lòng thử lại."}
              </AlertDescription>
            </Alert>
          )}

          {mutation.isPending && (
            <Card className="mb-6">
              <CardContent className="py-8 space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          )}

          {result && !mutation.isPending && <ResultPanel result={result} />}

          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tuyên bố miễn trừ trách nhiệm:</strong> Dự đoán do AI tạo ra dựa trên dữ liệu
              công khai và mô hình ngôn ngữ; <strong>không phải</strong> tư vấn tài chính, không
              đảm bảo độ chính xác. Thị trường tài chính có thể biến động bất thường — bạn tự chịu
              trách nhiệm với mọi quyết định đầu tư.
            </AlertDescription>
          </Alert>

          <section className="mt-12 prose prose-sm dark:prose-invert max-w-none">
            <h2>AI dự đoán giá hoạt động thế nào?</h2>
            <p>
              Công cụ truy xuất dữ liệu giá <strong>thời gian thực</strong> của vàng SJC, vàng nhẫn,
              xăng dầu Petrolimex, dầu Brent/WTI, Bitcoin, Ethereum và các cặp tỷ giá ngoại tệ — sau
              đó gửi tới mô hình AI để phân tích xu hướng ngắn hạn. Mô hình đưa ra: hướng giá kỳ
              vọng (tăng / giảm / đi ngang), biên độ % thay đổi, mức độ tự tin, các động lực chính
              và rủi ro có thể đảo chiều dự báo, kèm 3 kịch bản tham khảo (lạc quan / cơ sở / bi
              quan).
            </p>
            <h2>Các tài sản được hỗ trợ</h2>
            <ul>
              <li>
                <strong>Kim loại quý:</strong> Vàng SJC, vàng nhẫn 9999, XAU/USD, bạc, bạch kim.
              </li>
              <li>
                <strong>Năng lượng:</strong> Dầu Brent, dầu WTI, xăng RON 95-III, E5 RON 92, dầu
                Diesel 0,05S-II.
              </li>
              <li>
                <strong>Tiền điện tử:</strong> Bitcoin, Ethereum, Solana, BNB, XRP.
              </li>
              <li>
                <strong>Ngoại tệ:</strong> USD/VND, EUR/VND, JPY/VND.
              </li>
            </ul>
            <h2>Câu hỏi thường gặp</h2>
            <h3>AI dự đoán giá có chính xác 100% không?</h3>
            <p>Không. AI chỉ đưa ra ước lượng xác suất; mọi dự đoán chỉ mang tính tham khảo.</p>
            <h3>Tính năng có miễn phí không?</h3>
            <p>Có, hoàn toàn miễn phí cho người dùng MarketWatch.vn.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ResultPanel({ result }: { result: PredictionResult }) {
  const meta = PREDICTABLE_ASSETS.find((a) => a.slug === result.asset)!;
  const horizonLabel = HORIZONS.find((h) => h.value === result.horizon)!.label;
  const range = `${result.expected_change_pct_low.toFixed(2)}% → ${result.expected_change_pct_high.toFixed(2)}%`;
  return (
    <Card className="mb-6 animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              {dirIcon(result.direction)}
              <span>{meta.label}</span>
              <span className="text-muted-foreground font-normal text-sm">· {horizonLabel}</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Cập nhật: {new Date(result.generated_at).toLocaleString("vi-VN")}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`text-2xl font-bold ${dirColor(result.direction)}`}>
              {result.direction.toUpperCase()}
            </div>
            <Badge variant={confidenceVariant(result.confidence)}>
              Độ tự tin: {result.confidence}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Biên độ % thay đổi kỳ vọng</div>
            <div className={`text-lg font-semibold mt-1 ${dirColor(result.direction)}`}>{range}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Đơn vị</div>
            <div className="text-lg font-semibold mt-1">{meta.unit}</div>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Tổng quan</div>
          <p className="text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <div className="text-sm font-semibold mb-2">Động lực chính</div>
            <ul className="space-y-1.5 text-sm">
              {result.drivers.map((d, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary mt-0.5">▸</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">Rủi ro đảo chiều</div>
            <ul className="space-y-1.5 text-sm">
              {result.risks.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Kịch bản tham khảo</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                Lạc quan
              </div>
              <p className="text-sm">{result.scenarios.bullish}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Cơ sở</div>
              <p className="text-sm">{result.scenarios.base}</p>
            </div>
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
              <div className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
                Bi quan
              </div>
              <p className="text-sm">{result.scenarios.bearish}</p>
            </div>
          </div>
        </div>

        {result.context && (
          <details className="text-xs text-muted-foreground border-t pt-3">
            <summary className="cursor-pointer hover:text-foreground">
              Dữ liệu thị trường AI đã tham khảo
            </summary>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px]">{result.context}</pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}