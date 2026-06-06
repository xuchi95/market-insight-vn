import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Newspaper } from "lucide-react";
import {
  getNewsSettings,
  updateNewsSettings,
} from "@/lib/admin/news-settings.functions";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_admin/mw-admin/news-settings")({
  component: NewsSettingsPage,
});

function NewsSettingsPage() {
  const getFn = useServerFn(getNewsSettings);
  const updateFn = useServerFn(updateNewsSettings);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "news-settings"],
    queryFn: () => getFn(),
  });

  async function toggle(next: boolean) {
    try {
      await updateFn({ data: { cmc_enabled: next } });
      toast.success(
        next ? "Đã bật CoinMarketCap làm nguồn tin" : "Đã tắt CoinMarketCap",
      );
      qc.invalidateQueries({ queryKey: ["admin", "news-settings"] });
      // Buộc mọi widget tin crypto đang mở (kể cả trên tab admin này)
      // refetch ngay -> server đã clear cache khi updated_at thay đổi.
      qc.invalidateQueries({ queryKey: ["crypto-news"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl">Cấu hình nguồn tin</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý nguồn bài viết hiển thị trên trang chi tiết tiền điện tử
          (<code>/tai-san/&lt;symbol&gt;</code>).
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <Newspaper className="mt-0.5 h-5 w-5 text-[var(--gold)]" />
          <div className="flex-1">
            <h2 className="font-display text-lg">CoinDesk News API</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Khi bật, hệ thống lấy tin tức từ CoinDesk Data API
              (endpoint <code>/news/v1/article/list</code>) làm nguồn tin cho
              trang chi tiết tiền điện tử. Endpoint công khai, miễn phí, không
              cần API key. Tắt nếu muốn ẩn widget tin — khi đó danh sách sẽ
              trống. Thay đổi có hiệu lực trong vòng 10 giây.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {isLoading || !data ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <div className="flex items-center justify-between rounded-md border border-border bg-background/40 p-4">
                <div>
                  <div className="text-sm font-medium">Bật widget tin tức (CoinDesk)</div>
                  <div className="text-xs text-muted-foreground">
                    {data.cmc_enabled
                      ? "Đang lấy tin tức từ CoinDesk Data API."
                      : "Đã tắt — danh sách tin sẽ trống."}
                  </div>
                </div>
                <Switch
                  checked={data.cmc_enabled}
                  onCheckedChange={toggle}
                />
              </div>

              <div className="flex items-start gap-3 rounded-md border border-border bg-background/40 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                <div className="flex-1 text-xs text-muted-foreground leading-relaxed">
                  <div className="text-sm font-medium text-foreground">
                    Không cần API key
                  </div>
                  CoinDesk Data API miễn phí cho free tier — không có giới hạn
                  quota cứng. Nếu sau này muốn nâng cấp, xem tài liệu tại{" "}
                  <a
                    href="https://developers.coindesk.com/documentation/data-api/news_v1_article_list"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--gold)] underline"
                  >
                    developers.coindesk.com
                  </a>
                  .
                </div>
              </div>

              {data.updated_at && (
                <div className="text-xs text-muted-foreground">
                  Cập nhật cuối: {new Date(data.updated_at).toLocaleString("vi-VN")}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}