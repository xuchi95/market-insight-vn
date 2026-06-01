## Tình trạng hiện tại của nút "Theo dõi"

Nút **không phải làm cảnh**: nó đã ghi vào bảng `watchlist_items` (cloud nếu đăng nhập, `localStorage` nếu khách) và hiển thị danh sách theo dõi ở header / một số nơi khác. **Nhưng** hệ thống chưa gửi email khi tài sản biến động — đó là phần cần làm thêm.

Bảng `user_price_alerts` đã tồn tại nhưng nó dành cho cảnh báo **ngưỡng giá cụ thể** (`>= X USD`), không phải "biến động bất cứ lúc nào". Mình sẽ làm một lớp riêng cho watchlist alerts.

---

## Phạm vi sẽ build

### 1. Database
Migration mới:
- `ALTER TABLE watchlist_items ADD COLUMN email_alerts_enabled boolean NOT NULL DEFAULT true, ADD COLUMN alert_threshold_pct numeric NOT NULL DEFAULT 5, ADD COLUMN last_alert_sent_at timestamptz, ADD COLUMN last_alert_price_usd numeric;`
- `ALTER TABLE profiles ADD COLUMN watchlist_alerts_global_enabled boolean NOT NULL DEFAULT true;` (kill-switch toàn cục để opt-out hoàn toàn).
- Bảng mới `watchlist_price_snapshots(symbol text primary key, asset_type text, price_usd numeric, captured_at timestamptz)` — dùng để so sánh biến động giữa các lần chạy cron.

### 2. Server function & route
- `src/lib/watchlist/alerts.functions.ts`:
  - `updateAlertPrefs({ symbol, emailEnabled, thresholdPct })` (auth required) — chỉnh per-item.
  - `setGlobalAlertsEnabled({ enabled })` — toggle toàn cục.
- `src/routes/api/public/cron/watchlist-alerts.ts` (server route, bảo vệ bằng `CRON_SECRET` header):
  - Lấy snapshot giá hiện tại từ các service đã có (`fetchCryptoPrices`, `fetchStockIndices`, `fetchGoldPrices`, `fetchForexRates`).
  - So sánh với `watchlist_price_snapshots` → tính % biến động.
  - Với mỗi symbol vượt ngưỡng: tìm tất cả user trong `watchlist_items` có `email_alerts_enabled=true`, `profiles.watchlist_alerts_global_enabled=true`, ngưỡng cá nhân `<= biến động`, và `last_alert_sent_at` cách hiện tại >= cooldown (mặc định 6h) → enqueue email qua RPC `enqueue_email`.
  - Cập nhật `last_alert_sent_at` + snapshot mới.
- pg_cron job chạy mỗi 15 phút gọi endpoint trên (qua URL `project--{id}.lovable.app`).

### 3. Email template
- Template `watchlist_alert` (HTML + text) trong queue payload: tên tài sản, giá hiện tại, % biến động, link tới trang chi tiết, link **"Tắt cảnh báo tài sản này"** (token) + link **"Tắt toàn bộ cảnh báo"** (token), dùng `email_unsubscribe_tokens` đã có.

### 4. UI
- Nâng cấp `WatchButton`: thay vì button đơn, dùng `Popover` — bấm vào hiện popover có:
  - Toggle "Theo dõi" (giữ logic hiện tại).
  - Toggle "Nhận email khi biến động ≥ X%" + select ngưỡng (3 / 5 / 10 / 15 %).
  - Nếu chưa đăng nhập → toggle email bị disable + dòng "Đăng nhập để nhận email cảnh báo".
- Trang mới `/tai-khoan/canh-bao` (route `_authenticated`): bảng tất cả tài sản đang theo dõi với toggle email + ngưỡng + nút xoá; ở đầu trang có Switch "Tạm dừng toàn bộ cảnh báo email" → `profiles.watchlist_alerts_global_enabled`.
- Trang public `/email/unsubscribe?token=...` xử lý unsubscribe per-item hoặc global từ link email.
- Admin: thêm trang `_admin/mw-admin.alerts.tsx` để xem số alert đã gửi 24h/7 ngày, top symbol có biến động.

### 5. Secrets
- Thêm secret `CRON_SECRET` (mình sẽ yêu cầu add_secret) để bảo vệ endpoint cron.

---

## Câu hỏi cần xác nhận trước khi build

1. **Ngưỡng mặc định** % biến động kích hoạt email là **5%** (so với lần snapshot trước), và **cooldown 6h** giữa các email cho cùng 1 user + 1 symbol — OK chứ?
2. **Tần suất cron** mỗi **15 phút** OK chứ? (Crypto biến động nhanh; chứng khoán/vàng chỉ chạy trong giờ giao dịch — mình sẽ skip ngoài giờ với crypto vẫn 24/7.)
3. User **chưa đăng nhập** bấm "Theo dõi" hiện chỉ lưu localStorage → có cần prompt đăng nhập để bật email không? (Đề xuất: vẫn cho lưu local, hiện CTA "Đăng nhập để nhận email" trong popover.)
4. Có cần làm trang `/tai-khoan/canh-bao` + trang admin alerts ngay turn này không, hay chỉ làm phần button + cron + email trước, UI quản lý làm turn sau?
