import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/cong-cu/widget-nhung`;
const TITLE = "Widget bảng giá MarketWatch — Nhúng vào blog / website của bạn";
const DESC =
  "Nhúng widget bảng giá realtime của MarketWatch vào blog, website, hoặc trang tin của bạn chỉ với 1 dòng <iframe>. Hỗ trợ tùy chọn tài sản, light/dark theme, miễn phí, có thuộc tính chính thức.";

export const Route = createFileRoute("/cong-cu/widget-nhung")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "widget bảng giá vàng, embed giá bitcoin, iframe tỷ giá usd, widget marketwatch, nhúng giá vàng",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: WidgetEmbedPage,
});

const ASSET_CHOICES = [
  { id: "sjc", label: "Vàng SJC" },
  { id: "btc", label: "Bitcoin" },
  { id: "eth", label: "Ethereum" },
  { id: "usd", label: "USD/VND" },
  { id: "eur", label: "EUR/VND" },
];

function WidgetEmbedPage() {
  const [selected, setSelected] = useState<string[]>(["sjc", "btc", "usd"]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [width, setWidth] = useState<string>("100%");
  const [height, setHeight] = useState<number>(170);
  const [compact, setCompact] = useState<boolean>(false);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (selected.length) sp.set("assets", selected.join(","));
    sp.set("theme", theme);
    if (compact) sp.set("compact", "1");
    return sp.toString();
  }, [selected, theme, compact]);

  // Snippet để user copy: luôn dùng URL production.
  const src = useMemo(() => `${SITE}/embed/gia?${query}`, [query]);
  // Preview trong app: dùng same-origin để không bị chặn / lệch deployment.
  const previewSrc = useMemo(() => `/embed/gia?${query}`, [query]);

  const snippet = useMemo(() => {
    return `<iframe
  src="${src}"
  width="${width}"
  height="${height}"
  frameborder="0"
  scrolling="no"
  style="border:0;max-width:100%;"
  title="Bảng giá MarketWatch"
  loading="lazy"
></iframe>`;
  }, [src, width, height]);

  const copy = () => {
    navigator.clipboard.writeText(snippet).then(
      () => toast.success("Đã copy mã nhúng vào clipboard"),
      () => toast.error("Không copy được, hãy copy thủ công"),
    );
  };

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <Breadcrumbs />
          <header className="mt-4 mb-6">
            <h1 className="font-display text-3xl md:text-5xl">Nhúng bảng giá vào website của bạn</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Tùy chỉnh tài sản, theme, kích thước và copy mã <code className="text-[var(--gold)]">&lt;iframe&gt;</code> để dán vào blog, website hoặc trang tin của bạn. Dữ liệu realtime, miễn phí, cập nhật mỗi 60 giây.
            </p>
          </header>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4 rounded-lg border border-border p-5">
              <h2 className="font-display text-lg">Tùy chỉnh</h2>
              <div>
                <Label className="mb-2 block">Tài sản hiển thị</Label>
                <div className="flex flex-wrap gap-2">
                  {ASSET_CHOICES.map((a) => {
                    const active = selected.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggle(a.id)}
                        className={`text-xs rounded-full border px-3 py-1.5 transition ${
                          active
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Theme</Label>
                <div className="flex gap-2">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`text-xs rounded-full border px-3 py-1.5 transition ${
                        theme === t
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "dark" ? "Tối" : "Sáng"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="w">Chiều rộng</Label>
                  <Input id="w" value={width} onChange={(e) => setWidth(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="h">Chiều cao (px)</Label>
                  <Input id="h" type="number" value={height} onChange={(e) => setHeight(Number(e.target.value) || 170)} className="mt-1" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
                <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
                Ẩn dòng "MARKETWATCH.VN" ở chân widget
              </label>
              <p className="text-xs text-muted-foreground">
                Yêu cầu: nếu bạn ẩn dòng chân widget, vui lòng ghi nguồn "Dữ liệu: MarketWatch.vn" ở gần widget.
              </p>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  Xem trước
                </div>
                <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                  <iframe
                    src={previewSrc}
                    width="100%"
                    height={height}
                    frameBorder={0}
                    scrolling="no"
                    style={{ border: 0, display: "block" }}
                    title="Bảng giá MarketWatch — Preview"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Mã nhúng &lt;iframe&gt;
                  </div>
                  <button
                    onClick={copy}
                    className="text-xs rounded-md border border-border px-3 py-1.5 hover:bg-muted/50"
                  >
                    Copy
                  </button>
                </div>
                <pre className="rounded-lg border border-border bg-muted/30 p-4 text-xs overflow-x-auto whitespace-pre-wrap">
                  {snippet}
                </pre>
              </div>

              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground space-y-2">
                <h3 className="font-display text-base text-foreground">Hướng dẫn nhanh</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Sao chép đoạn <code>&lt;iframe&gt;</code> ở trên và dán vào trang HTML / bài viết WordPress / Ghost / Medium custom HTML.</li>
                  <li>Widget tự cập nhật mỗi 60 giây, dữ liệu lấy từ <code>/api/public/widget-snapshot</code>.</li>
                  <li>Tham số: <code>assets=sjc,btc,usd&amp;theme=dark&amp;compact=1</code>.</li>
                  <li>Miễn phí cho mọi mục đích phi thương mại và thương mại có ghi nguồn.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}