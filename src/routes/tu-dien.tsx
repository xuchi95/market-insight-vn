import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { GLOSSARY, CATEGORY_LABEL, type GlossaryTerm } from "@/lib/data/glossary";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/tu-dien`;
const TITLE = "Từ điển tài chính — Giải thích thuật ngữ đầu tư bằng tiếng Việt";
const DESC =
  "Từ điển hơn 30 thuật ngữ tài chính - đầu tư phổ biến nhất: DCA, ROI, lãi kép, Bitcoin halving, P/E, VN-Index, Fed, CPI… Giải thích ngắn gọn, dễ hiểu, kèm ví dụ.";

export const Route = createFileRoute("/tu-dien")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "từ điển tài chính, dca là gì, roi là gì, lãi kép, halving, p/e là gì, vn-index, fed, cpi",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          name: "Từ điển tài chính MarketWatch",
          url: URL,
          inLanguage: "vi-VN",
          hasDefinedTerm: GLOSSARY.map((t) => ({
            "@type": "DefinedTerm",
            name: t.term,
            description: t.short,
            url: `${SITE}/tu-dien/${t.slug}`,
          })),
        }),
      },
    ],
  }),
  component: GlossaryIndex,
});

function GlossaryIndex() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return GLOSSARY.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!needle) return true;
      const hay = `${t.term} ${t.short} ${(t.keywords ?? []).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    }).sort((a, b) => a.term.localeCompare(b.term, "vi"));
  }, [q, cat]);

  const cats = useMemo(() => {
    const set = new Set(GLOSSARY.map((t) => t.category));
    return ["all", ...Array.from(set)];
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <Breadcrumbs />
          <header className="mt-4 mb-6">
            <h1 className="font-display text-3xl md:text-5xl">Từ điển tài chính</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Hơn {GLOSSARY.length} thuật ngữ tài chính - đầu tư phổ biến nhất, giải thích bằng tiếng Việt dễ hiểu, kèm ví dụ và liên kết tới dữ liệu thực tế trên MarketWatch.
            </p>
          </header>

          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <Input
              placeholder="Tìm thuật ngữ… (vd: dca, lãi kép, halving)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="md:max-w-sm"
            />
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`text-xs uppercase tracking-[0.14em] rounded-full border px-3 py-1.5 transition ${
                    cat === c
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c === "all" ? "Tất cả" : CATEGORY_LABEL[c as GlossaryTerm["category"]]}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
              Không tìm thấy thuật ngữ phù hợp.
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((t) => (
                <li key={t.slug}>
                  <Link
                    to="/tu-dien/$slug"
                    params={{ slug: t.slug }}
                    className="block h-full rounded-lg border border-border p-4 hover:border-foreground/40 transition"
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {CATEGORY_LABEL[t.category]}
                    </div>
                    <div className="mt-1 font-display text-lg">{t.term}</div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{t.short}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}