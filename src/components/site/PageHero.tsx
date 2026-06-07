import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
}

/**
 * Editorial page hero — eyebrow + serif headline + lede.
 * Matches the tone of the home page masthead so section pages
 * (gold, crypto, bank rates, oil, stocks) feel part of the same publication.
 */
export function PageHero({ eyebrow, title, description }: Props) {
  return (
    <section className="py-10 md:py-14 border-b border-border">
      <div className="eyebrow opacity-60 mb-3">{eyebrow}</div>
      <h1 className="font-display font-bold text-[2rem] sm:text-[2.5rem] md:text-5xl leading-[1.05] tracking-[-0.018em] text-balance">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-sm md:text-base text-foreground/80 leading-relaxed text-pretty">
        {description}
      </p>
    </section>
  );
}