## Tổng quan

Tạo trang `/mw-admin/analytics` cho admin, gồm:
- Log sự kiện ẩn danh (ads, pageview, scroll/dwell, click, funnel) từ trình duyệt vào DB qua 1 endpoint công khai có rate-limit, chỉ chạy khi user đã đồng ý cookie Phân tích.
- Dashboard với KPI cards, biểu đồ 30 ngày, heatmap 7×24, bảng top route/placement, bộ lọc khoảng thời gian + export CSV.
- Tích hợp AdSense Management API (giai đoạn 2) để hiện impression/click/CTR/RPM/revenue thật.

## Phần 1 — Thu thập sự kiện

### DB schema (1 migration)
- `analytics_events` (admin-only, không expose anon): `id`, `ts timestamptz default now()`, `event_type text` (`ad_view|ad_render|ad_click|pageview|scroll|dwell|click_outbound|click_cta|funnel_step`), `session_id text`, `anon_id text` (hash UA+IP+salt, đổi mỗi 24h), `route text`, `referrer_host text`, `device text` (`mobile|tablet|desktop`), `country text` (CF-IPCountry), `placement text`, `ad_slot text`, `format text`, `target text`, `value numeric`, `meta jsonb`, `user_id uuid` (nullable, không FK auth.users).
- Index: `(ts desc)`, `(event_type, ts desc)`, `(route, ts desc)`, `(session_id)`.
- Bảng `analytics_daily_agg` (rollup theo ngày + route + event_type) để truy vấn nhanh — refresh bằng pg_cron 5 phút/lần.
- RLS: service_role + admin (qua `has_role`) đọc; không có policy anon/authenticated. Bổ sung memory ghi nhận tính chất admin-only.

### Endpoint ingest: `POST /api/public/analytics/ingest`
- `supabaseAdmin` insert, Zod validate.
- Rate limit theo IP: tối đa 60 event/phút bằng bảng `rate_limit_buckets` đã có hoặc thêm bucket riêng; batch tối đa 20 event/request.
- Lấy `cf-ipcountry`, `user-agent` để suy ra `device` + `country` ở server (không lưu IP/UA thô).
- Drop event nếu thiếu `event_type` hoặc `route` vượt 256 ký tự, hoặc `meta` > 2KB.

### Client tracker (`src/lib/analytics/tracker.ts`)
- Queue + flush bằng `navigator.sendBeacon` khi tab ẩn / mỗi 5 s.
- `session_id` lưu sessionStorage; `anon_id` lưu localStorage 24h.
- Chỉ gửi khi `useCookieConsent().prefs.analytics === true`; tự dừng khi user thu hồi consent.
- Wrapper:
  - `trackPageview()` — gọi trong `__root.tsx` qua `router.subscribe('onResolved')`.
  - `trackScroll()` + `trackDwell()` — hook `useEngagementTracking()` gắn 1 lần ở root, bắn ngưỡng 25/50/75/100% + dwell mỗi 15 s.
  - `trackClick()` — listener `click` toàn cục: outbound link và bất kỳ phần tử có `data-cta="..."`.
  - `trackFunnel(step)` — gọi tại các điểm: xem giá tài sản, thêm watchlist, tạo alert, đăng ký newsletter.
  - `trackAd(event, payload)` — `AdSlot` chuyển từ chỉ bắn CustomEvent sang gọi trực tiếp tracker (giữ event window cho debug). Thêm bắt click iframe AdSense bằng `window.blur` heuristic phát sinh `ad_click`.

### Tích hợp UI
- `AdSlot.tsx`: thay `trackAdEvent` bằng `tracker.trackAd`.
- Watchlist/Alerts/Newsletter component gọi `trackFunnel`.
- `data-cta` được thêm vào CTA chính: Đăng ký, Mở watchlist, Tạo alert, Đăng ký newsletter.

## Phần 2 — Server fns admin

`src/lib/admin/analytics.functions.ts` (middleware `requireAdmin`):
- `getAnalyticsKpis(range)` — views, unique, pageviews, ad_impressions, ad_clicks, CTR, avg dwell, so sánh kỳ trước.
- `getAnalyticsTimeseries(range, bucket)` — daily/hourly.
- `getAnalyticsHeatmap(range)` — matrix 7×24 ngày × giờ.
- `getTopRoutes(range, limit)` + `getTopPlacements(range)`.
- `getFunnel(range)` — counts cho 4 bước funnel.
- `exportAnalyticsCsv(range, type)` — trả CSV string.
Tất cả query bảng `analytics_daily_agg` khi range > 2 ngày, fallback `analytics_events` cho realtime.

## Phần 3 — Trang admin

`src/routes/_admin/mw-admin.analytics.tsx`:
- Date range picker (7/30/90/custom).
- 6 KPI cards: Views, Unique, Pageviews, Ad impressions, Ad clicks (CTR), Avg dwell — kèm % vs kỳ trước.
- LineChart 30 ngày (recharts) views vs ad_impressions.
- Heatmap 7×24 (div grid).
- Bảng Top Route (path, views, avg dwell, scroll>75%).
- Bảng Top Placement (placement, impressions, clicks, CTR).
- Funnel bar.
- Nút Export CSV cho từng bảng.
- Thêm vào menu admin sidebar.

## Phần 4 — AdSense Management API (tùy chọn bật sau)

- Connector `google_adsense` qua Lovable connectors (OAuth). Khi link, thêm:
  - `src/lib/admin/adsense.server.ts` gọi `accounts.reports.generate` lấy revenue, RPM, CTR.
  - Card AdSense doanh thu trên dashboard hiển thị khi có connection; nếu chưa link, hiện nút "Kết nối Google AdSense".
- Không khóa tính năng dashboard chính vào AdSense API — phần này phụ thuộc admin thao tác.

## Lưu ý kỹ thuật

- Tracker phải tôn trọng `Do Not Track` (`navigator.doNotTrack === "1"`).
- Không lưu PII: bỏ query string nhạy cảm khỏi `route` (giữ pathname + whitelist param: `?symbol`, `?tab`).
- pg_cron daily 3:00 dọn `analytics_events` > 90 ngày để tránh phình DB; rollup giữ 13 tháng.
- Tất cả endpoint ingest có timeout 5 s, fail-silent về client để không ảnh hưởng UX.
- Cập nhật `mem://index.md`: thêm rule `analytics_events` admin-only.

## Phạm vi loại trừ

- Không thay Google Analytics / GA4 hiện có.
- Không thực thi rule-engine cảnh báo bất thường (có thể làm sau).
- AdSense API chỉ scaffold sau khi user link connector.
