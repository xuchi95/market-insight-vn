import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ExternalLink, Loader2, MessageSquareText, RefreshCw, AlertTriangle, Newspaper } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsItem {
  id: string;
  title: string;
  url: string;
  body: string;
  image: string;
  source: string;
  sourceImage: string;
  publishedAt: number;
  tags: string[];
}

interface NewsPayload {
  updatedAt: number;
  category: string;
  items: NewsItem[];
}

async function fetchCryptoNews(symbol: string): Promise<NewsPayload> {
  const u = new URL("/api/public/crypto-news", window.location.origin);
  if (symbol) u.searchParams.set("category", symbol.toUpperCase());
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function timeAgo(ts: number): string {
  if (!ts) return "";
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(ts).toLocaleDateString("vi-VN");
}

export function CryptoCommunityFeed({ symbol, name }: { symbol: string; name?: string }) {
  const sym = symbol.toUpperCase();
  const [limit, setLimit] = useState(8);
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["crypto-news", sym],
    queryFn: () => fetchCryptoNews(sym),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const shown = items.slice(0, limit);
  const canShowMore = items.length > shown.length;

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 lg:p-5 border-b border-border">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15 text-gold">
          <MessageSquareText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight">
            Cộng đồng CoinMarketCap nói gì về {name ?? sym}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bài đăng cộng đồng trên CoinMarketCap về {sym} — cập nhật mỗi 5 phút.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Đang cập nhật" />}
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium hover:bg-muted/40"
            disabled={isFetching}
          >
            <RefreshCw className="h-3 w-3" /> Làm mới
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-5">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/20 p-3 flex gap-3">
                <Skeleton className="h-20 w-24 rounded-md shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <AlertTriangle className="h-7 w-7 text-[var(--down)]" />
            <div className="text-sm font-semibold">Không tải được tin tức cộng đồng</div>
            <div className="text-xs text-muted-foreground max-w-xs">
              {error instanceof Error ? error.message : "Lỗi không xác định"}.
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/40"
            >
              <RefreshCw className="h-3 w-3" /> Thử lại
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Newspaper className="h-7 w-7 opacity-60" />
            Chưa có bài đăng nào về {sym} trong thời gian gần đây.
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2">
              {shown.map((it) => (
                <li key={it.id}>
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="group flex gap-3 rounded-xl border border-border bg-muted/10 p-3 hover:border-[var(--gold)] hover:bg-muted/30 transition-colors h-full"
                  >
                    {it.image ? (
                      <img
                        src={it.image}
                        alt=""
                        loading="lazy"
                        className="h-20 w-24 shrink-0 rounded-md object-cover bg-muted"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-20 w-24 shrink-0 rounded-md bg-muted grid place-items-center">
                        <Newspaper className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 flex flex-col">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {it.sourceImage && (
                          <img
                            src={it.sourceImage}
                            alt=""
                            className="h-3.5 w-3.5 rounded-sm object-contain"
                            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                          />
                        )}
                        <span className="font-medium truncate">{it.source || "Nguồn"}</span>
                        <span>·</span>
                        <span className="shrink-0">{timeAgo(it.publishedAt)}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-semibold leading-snug line-clamp-2 group-hover:text-[var(--gold)]">
                        {it.title}
                      </h3>
                      {it.body && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{it.body}</p>
                      )}
                      <div className="mt-auto pt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-3 w-3" /> Đọc bài gốc
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
            {canShowMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setLimit((n) => n + 8)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted/40"
                >
                  Xem thêm bài đăng
                </button>
              </div>
            )}
            <p className="mt-4 text-[11px] text-muted-foreground text-center">
              Nguồn: bài đăng cộng đồng CoinMarketCap. MarketWatch không chịu trách nhiệm về nội dung của bên thứ ba.
            </p>
          </>
        )}
      </div>
    </section>
  );
}