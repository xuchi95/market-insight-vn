import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpDown, Info } from "lucide-react";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SectionCard } from "@/components/site/SectionCard";
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { Input } from "@/components/ui/input";
import { SAVINGS_RATES, SAVINGS_UPDATED_AT, TENORS, type SavingsRate } from "@/lib/data/savingsRates";
import { cn } from "@/lib/utils";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/lai-suat-tiet-kiem`;
const TITLE = "Lãi suất tiết kiệm ngân hàng hôm nay — so sánh 20+ ngân hàng";
const DESC = "Bảng so sánh lãi suất gửi tiết kiệm tại Vietcombank, BIDV, Techcombank, MB, ACB, VPBank… các kỳ hạn 1, 3, 6, 9, 12, 24, 36 tháng — VND, lĩnh lãi cuối kỳ.";

const GROUP_LABEL: Record<SavingsRate["group"], string> = {
  SOCB: "NH quốc doanh",
  "Joint-Stock": "NH TMCP",
  Foreign: "NH nước ngoài",
};

export const Route = createFileRoute("/lai-suat-tiet-kiem")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "lãi suất tiết kiệm, lãi suất gửi tiết kiệm, lãi suất ngân hàng, vietcombank, bidv, techcombank, mb bank, lãi suất 12 tháng" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: TITLE,
          description: DESC,
          url: URL,
          inLanguage: "vi-VN",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE + "/" },
            { "@type": "ListItem", position: 2, name: "Lãi suất tiết kiệm", item: URL },
          ],
        }),
      },
    ],
  }),
  component: SavingsPage,
});

function SavingsPage() {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<keyof SavingsRate["rates"] | "bank">("m12");
  const [desc, setDesc] = useState(true);
  const [items, setItems] = useState<SavingsRate[]>(SAVINGS_RATES);
  const [updatedAt, setUpdatedAt] = useState<string>(SAVINGS_UPDATED_AT);
  const [source, setSource] = useState<string>("Đang tải...");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/savings-rates")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d?.items) && d.items.length > 0) {
          setItems(d.items as SavingsRate[]);
          if (d.updatedAt) setUpdatedAt(d.updatedAt);
          if (d.source) setSource(d.source);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = items.filter((b) =>
      !term || b.bank.toLowerCase().includes(term) || b.shortName.toLowerCase().includes(term),
    );
    r = [...r].sort((a, b) => {
      if (sortKey === "bank") return a.bank.localeCompare(b.bank);
      const av = a.rates[sortKey] ?? -1;
      const bv = b.rates[sortKey] ?? -1;
      return desc ? bv - av : av - bv;
    });
    return r;
  }, [q, sortKey, desc, items]);

  function toggleSort(k: keyof SavingsRate["rates"] | "bank") {
    if (sortKey === k) setDesc((v) => !v);
    else {
      setSortKey(k);
      setDesc(k !== "bank");
    }
  }

  // Highlight top 3 per tenor (cho cột đang sort)
  const topValues = useMemo(() => {
    if (sortKey === "bank") return new Set<number>();
    const vals = rows.map((r) => r.rates[sortKey]).filter((v): v is number => typeof v === "number");
    const sorted = [...new Set(vals)].sort((a, b) => b - a).slice(0, 3);
    return new Set(sorted);
  }, [rows, sortKey]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-10 space-y-8">
          <Breadcrumbs />
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Lãi suất tiết kiệm ngân hàng hôm nay</h1>
            <p className="text-muted-foreground max-w-2xl">
              So sánh <strong>lãi suất gửi tiết kiệm</strong> tại {items.length}+ ngân hàng cho các kỳ hạn 1 – 36 tháng (VND, gửi tại quầy, lĩnh lãi cuối kỳ). Cập nhật: <strong>{updatedAt}</strong> · Nguồn: {source}.
            </p>
          </header>

          <SectionCard
            title="Bảng lãi suất tiết kiệm"
            meta={<span>{rows.length}/{items.length} ngân hàng</span>}
            action={
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm ngân hàng…"
                className="h-8 w-44 text-xs"
              />
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-3 py-2 sticky left-0 bg-card">
                      <button onClick={() => toggleSort("bank")} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                        Ngân hàng <ArrowDownAZ className="h-3 w-3" />
                      </button>
                    </th>
                    {TENORS.map((t) => (
                      <th key={t.key} className="px-3 py-2 text-right whitespace-nowrap">
                        <button onClick={() => toggleSort(t.key)} className={cn("inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-foreground", sortKey === t.key ? "text-[var(--gold)]" : "text-muted-foreground")}>
                          {t.label} <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.shortName} className="border-b border-border/40 hover:bg-accent/40">
                      <td className="px-3 py-2.5 sticky left-0 bg-card group-hover:bg-accent/40">
                        <div className="font-semibold">{b.bank}</div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">{GROUP_LABEL[b.group]}</div>
                      </td>
                      {TENORS.map((t) => {
                        const v = b.rates[t.key];
                        const isTop = sortKey === t.key && typeof v === "number" && topValues.has(v);
                        return (
                          <td key={t.key} className={cn("px-3 py-2.5 text-right tabular-nums", isTop && "bg-[var(--gold)]/15 text-[var(--gold)] font-bold")}>
                            {typeof v === "number" ? v.toFixed(2) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-start gap-2 px-4 py-3 border-t border-border bg-muted/30 text-sm text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>
                Dữ liệu tham khảo, tổng hợp từ trang chính thức của các ngân hàng. Lãi suất có thể thay đổi theo từng chương trình ưu đãi, số tiền gửi và kênh gửi (quầy/online). Vui lòng xác nhận trực tiếp tại ngân hàng trước khi quyết định.
              </p>
            </div>
          </SectionCard>

          <section className="rounded-2xl border border-[var(--gold)]/40 bg-gradient-to-br from-[var(--gold)]/[0.08] via-background to-background p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">Công cụ miễn phí</p>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-1">Tính lãi suất tiết kiệm online</h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
                Tính ngay tiền lãi gửi tiết kiệm theo lãi suất thật của 30+ ngân hàng — kỳ hạn 1 đến 36 tháng, lĩnh lãi cuối kỳ hoặc lãi kép tái tục.
              </p>
            </div>
            <Link
              to="/tinh-lai-suat-tiet-kiem"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 shrink-0"
            >
              Mở công cụ tính lãi →
            </Link>
          </section>

          <section aria-labelledby="savings-info" className="prose prose-invert max-w-none space-y-4">
            <h2 id="savings-info" className="text-2xl font-bold tracking-tight">Chọn ngân hàng gửi tiết kiệm thế nào?</h2>
            <p className="text-muted-foreground">
              Lãi suất tiết kiệm chỉ là một yếu tố. Bạn nên cân nhắc thêm: <strong>uy tín</strong> (nhóm NH quốc doanh như Vietcombank, BIDV, VietinBank, Agribank thường có lãi suất thấp hơn nhưng rủi ro cực thấp), <strong>tính linh hoạt</strong> (rút trước hạn, lãi nhập gốc), và <strong>ưu đãi cộng thêm</strong> (gửi online thường cộng 0.1 – 0.5%/năm).
            </p>
            <p className="text-muted-foreground">
              So sánh với các kênh đầu tư khác: <Link to="/gia-vang" className="text-primary hover:underline">vàng SJC</Link> phù hợp khi lạm phát cao, <Link to="/chung-khoan" className="text-primary hover:underline">chứng khoán</Link> cho mức sinh lời cao hơn nhưng rủi ro lớn hơn. Theo dõi thêm <Link to="/vi-mo-viet-nam" className="text-primary hover:underline">chỉ số vĩ mô Việt Nam</Link> để dự đoán xu hướng lãi suất.
            </p>
          </section>

          <RelatedLinks current="savings" />
        </div>
      </main>
      <Footer />
    </div>
  );
}