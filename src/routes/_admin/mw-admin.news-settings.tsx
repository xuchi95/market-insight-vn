import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, Newspaper, XCircle } from "lucide-react";
import {
  getNewsSettings,
  updateNewsSettings,
} from "@/lib/admin/news-settings.functions";
import { Button } from "@/components/ui/button";
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
            <h2 className="font-display text-lg">CoinMarketCap Content API</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Khi bật, hệ thống lấy bài viết từ CoinMarketCap
              (endpoint <code>/v1/content/latest</code>) làm nguồn tin duy nhất
              cho trang chi tiết tiền điện tử. Tắt nếu vượt quota — khi đó
              danh sách tin sẽ trống. Thay đổi có hiệu lực trong vòng 30 giây.
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
                  <div className="text-sm font-medium">Bật CoinMarketCap</div>
                  <div className="text-xs text-muted-foreground">
                    {data.cmc_enabled
                      ? "Đang lấy bài viết từ CoinMarketCap."
                      : "Đã tắt — danh sách tin sẽ trống."}
                  </div>
                </div>
                <Switch
                  checked={data.cmc_enabled}
                  onCheckedChange={toggle}
                  disabled={!data.cmc_key_present && !data.cmc_enabled}
                />
              </div>

              <div className="flex items-start gap-3 rounded-md border border-border bg-background/40 p-4">
                <KeyRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    Secret <code>CMC_API_KEY</code>
                    {data.cmc_key_present ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" /> đã cấu hình
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> chưa có
                      </span>
                    )}
                  </div>
                  {data.cmc_key_preview && (
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {data.cmc_key_preview}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Lấy key tại{" "}
                    <a
                      href="https://pro.coinmarketcap.com/account"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--gold)] underline"
                    >
                      pro.coinmarketcap.com/account
                    </a>
                    . Vì lý do bảo mật, secret được lưu ở Lovable Cloud — nhấn
                    nút bên dưới để thêm/cập nhật.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toast.info(
                          "Nhắn cho trợ lý Lovable: \"Cập nhật secret CMC_API_KEY\" để mở form nhập an toàn.",
                        )
                      }
                    >
                      {data.cmc_key_present ? "Cập nhật secret" : "Thêm secret"}
                    </Button>
                  </div>
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