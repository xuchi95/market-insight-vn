import { Newspaper } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchNews } from "@/lib/services/newsService";
import { SectionCard } from "./SectionCard";
import { Skeleton } from "@/components/ui/skeleton";

const CAT_LABEL: Record<string, string> = { gold: "Vàng", crypto: "Crypto", forex: "Tỷ giá", economy: "Kinh tế" };
const CAT_COLOR: Record<string, string> = {
  gold: "bg-gold/15 text-gold",
  crypto: "bg-[oklch(0.65_0.2_50)]/15 text-[oklch(0.65_0.2_50)]",
  forex: "bg-[oklch(0.55_0.18_250)]/15 text-[oklch(0.55_0.18_250)]",
  economy: "bg-muted text-muted-foreground",
};

function timeAgo(t: number) {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export function NewsSection() {
  const { data, isLoading } = useQuery({ queryKey: ["news"], queryFn: fetchNews, refetchInterval: 60_000 });
  return (
    <SectionCard id="news" icon={<Newspaper className="h-4 w-4" />} title="Tin mới thị trường" description="Cập nhật tin tức vàng, crypto, tỷ giá và kinh tế Việt Nam">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 bg-card"><Skeleton className="h-5 w-20 mb-3" /><Skeleton className="h-5 w-full mb-2" /><Skeleton className="h-5 w-3/4" /></div>
        ))}
        {data?.map((n) => (
          <a key={n.id} href={n.url} className="p-5 bg-card hover:bg-muted/40 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${CAT_COLOR[n.category]}`}>{CAT_LABEL[n.category]}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(n.publishedAt)}</span>
            </div>
            <h3 className="font-semibold leading-snug group-hover:text-gold transition-colors">{n.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{n.excerpt}</p>
            <div className="mt-3 text-xs text-muted-foreground">— {n.source}</div>
          </a>
        ))}
      </div>
    </SectionCard>
  );
}