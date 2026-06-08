import { useEffect, useState, type RefObject } from "react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

type TocItem = { id: string; text: string };

/**
 * Mục lục tự động cho các trang chính sách.
 * Quét các <h2> trong `contentRef`, tự gán `id` (nếu chưa có) và render
 * danh sách điều hướng dạng anchor link.
 */
export function PolicyToc({ contentRef }: { contentRef: RefObject<HTMLElement | null> }) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const headings = Array.from(el.querySelectorAll<HTMLHeadingElement>("h2"));
    const used = new Set<string>();
    const result: TocItem[] = headings.map((h, i) => {
      const text = (h.textContent || "").trim();
      let id = h.id || slugify(text) || `muc-${i + 1}`;
      let candidate = id;
      let n = 2;
      while (used.has(candidate)) candidate = `${id}-${n++}`;
      id = candidate;
      used.add(id);
      h.id = id;
      return { id, text };
    });
    setItems(result);

    if (result.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [contentRef]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Mục lục"
      className="not-prose rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-sm"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 sm:px-5 lg:hidden"
        aria-expanded={open}
        aria-controls="policy-toc-list"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Mục lục ({items.length})
        </span>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div className="hidden lg:block px-5 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Mục lục
        </p>
      </div>
      <ol
        id="policy-toc-list"
        className={`${open ? "block" : "hidden"} lg:block px-4 pb-4 pt-1 sm:px-5 sm:pb-5 space-y-1 text-sm`}
      >
        {items.map((it) => {
          const isActive = activeId === it.id;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                onClick={() => setOpen(false)}
                className={`block leading-snug py-1.5 pl-3 -ml-3 border-l-2 transition-colors ${
                  isActive
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-primary hover:border-primary/40"
                }`}
              >
                {it.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}