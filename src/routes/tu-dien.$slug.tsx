import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { findTerm, GLOSSARY, CATEGORY_LABEL, type GlossaryTerm } from "@/lib/data/glossary";

const SITE = "https://marketwatch.vn";

export const Route = createFileRoute("/tu-dien/$slug")({
  head: ({ params }) => {
    const t = findTerm(params.slug);
    if (!t) {
      return {
        meta: [
          { title: "Thuật ngữ không tồn tại — MarketWatch" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const url = `${SITE}/tu-dien/${t.slug}`;
    const title = `${t.term} là gì? — Từ điển tài chính MarketWatch`;
    const desc = t.short;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        {
          name: "keywords",
          content: [t.term, ...(t.keywords ?? [])].join(", "),
        },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:locale", content: "vi_VN" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "DefinedTerm",
            name: t.term,
            description: t.short,
            url,
            inDefinedTermSet: `${SITE}/tu-dien`,
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
              { "@type": "ListItem", position: 2, name: "Từ điển", item: SITE + "/tu-dien" },
              { "@type": "ListItem", position: 3, name: t.term, item: url },
            ],
          }),
        },
      ],
    };
  },
  loader: ({ params }): { term: GlossaryTerm } => {
    const term = findTerm(params.slug);
    if (!term) throw notFound();
    return { term };
  },
  component: TermPage,
});

function TermPage() {
  const { term } = Route.useLoaderData() as { term: GlossaryTerm };
  const related = (term.related ?? [])
    .map((s: string) => GLOSSARY.find((g) => g.slug === s))
    .filter((x): x is GlossaryTerm => Boolean(x));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-5 py-8">
          <Breadcrumbs />
          <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {CATEGORY_LABEL[term.category]}
          </div>
          <h1 className="mt-2 font-display text-3xl md:text-5xl">{term.term}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{term.short}</p>

          <div className="mt-8 prose prose-invert max-w-none">
            <h2 className="font-display text-xl mb-2">Giải thích chi tiết</h2>
            <p className="text-foreground/90 leading-relaxed">{term.body}</p>

            {term.examples && term.examples.length > 0 && (
              <>
                <h2 className="font-display text-xl mt-8 mb-2">Ví dụ</h2>
                <ul className="space-y-2">
                  {term.examples.map((ex: string, i: number) => (
                    <li key={i} className="text-foreground/85">• {ex}</li>
                  ))}
                </ul>
              </>
            )}

            {term.links && term.links.length > 0 && (
              <>
                <h2 className="font-display text-xl mt-8 mb-2">Dữ liệu liên quan</h2>
                <ul className="space-y-2">
                  {term.links.map((l: { label: string; to: string }, i: number) => (
                    <li key={i}>
                      <Link to={l.to as never} className="text-[var(--gold)] underline hover:opacity-80">
                        → {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {related.length > 0 && (
              <>
                <h2 className="font-display text-xl mt-8 mb-2">Thuật ngữ liên quan</h2>
                <div className="flex flex-wrap gap-2">
                  {related.map((r: GlossaryTerm) => (
                    <Link
                      key={r.slug}
                      to="/tu-dien/$slug"
                      params={{ slug: r.slug }}
                      className="text-sm rounded-full border border-border px-3 py-1.5 hover:border-foreground/40 transition"
                    >
                      {r.term}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-12 pt-6 border-t border-border">
            <Link to="/tu-dien" className="text-sm text-muted-foreground hover:text-foreground">
              ← Quay lại từ điển
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}