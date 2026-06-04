import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  id?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ id, title, description, icon, action, meta, children, className }: Props) {
  return (
    <section id={id} className={cn("scroll-mt-20", className)}>
      <div className="rounded-2xl border border-border bg-card [overflow:clip]">
        <div className="flex flex-wrap items-center gap-3 p-4 lg:p-5 border-b border-border">
          {icon && <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15 text-gold">{icon}</div>}
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {meta && <div className="ml-auto text-xs text-muted-foreground flex items-center gap-2">{meta}</div>}
          {action && <div className={cn(meta ? "" : "ml-auto", "flex items-center gap-2")}>{action}</div>}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--up)] opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--up)]" />
    </span>
  );
}