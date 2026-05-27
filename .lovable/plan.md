## Mục tiêu
Tích hợp Mailgun (domain `marketwatch.vn`) để gửi 3 loại email: xác nhận đăng ký nhận tin/liên hệ, cảnh báo biến động giá vàng/crypto, chào mừng tài khoản mới.

## Hạ tầng chung
1. **Enable Lovable Cloud** — cần auth (cho luồng đăng ký) và database (lưu subscribers, alerts theo user).
2. **Tạo helper Mailgun** `src/lib/email/mailgun.server.ts` — gọi qua connector gateway `https://connector-gateway.lovable.dev/mailgun/marketwatch.vn/messages` với `LOVABLE_API_KEY` + `MAILGUN_API_KEY`. Có hàm `sendEmail({ to, subject, html, text })` + template HTML brand MarketWatch (logo, màu, footer hợp pháp).
3. **Server routes** dưới `src/routes/api/`:
   - `api/newsletter/subscribe.ts` (POST public) — validate email (Zod), insert vào `newsletter_subscribers`, gửi email xác nhận.
   - `api/contact/submit.ts` (POST public) — validate (name/email/message), insert vào `contact_submissions`, gửi email xác nhận tới người liên hệ + forward tới `contact@marketwatch.vn`.
   - `api/public/price-alerts-cron.ts` (POST, bảo vệ bằng `CRON_SECRET` header) — chạy mỗi 5 phút qua pg_cron: lấy giá hiện tại, đối chiếu alerts `user_price_alerts`, gửi email cho user đã trigger, đánh dấu `triggered`.

## Database (migration mới)
- `newsletter_subscribers`: id, email (unique), confirmed_at, unsubscribed_at, created_at. RLS: insert public; select/update chỉ admin.
- `contact_submissions`: id, name, email, message, created_at. RLS: insert public; select admin.
- `user_price_alerts`: id, user_id (auth.users), symbol, asset_type (`crypto`|`gold`), direction (`above`|`below`), threshold_usd, triggered, triggered_at, created_at. RLS: user thao tác trên row của mình.
- `profiles`: id (auth.users), email, full_name, created_at — auto-insert qua trigger `handle_new_user`.
- GRANTs đầy đủ + RLS policies. Lưu `CRON_SECRET` qua secrets tool.

## Frontend
1. **Auth** — trang `/dang-ky`, `/dang-nhap` (email/password + Google). Hook `useAuth`. Trigger `handle_new_user` gửi welcome email qua server function gọi `mailgun`.
2. **Newsletter** — widget ở Footer (input email + nút "Đăng ký"). Submit POST `/api/newsletter/subscribe`, toast kết quả.
3. **Contact form** — bổ sung form ở `/lien-he` (name/email/message), POST `/api/contact/submit`.
4. **Price Alerts upgrade** — `PriceAlerts.tsx` chuyển từ localStorage sang DB khi user đã login (giữ localStorage làm fallback cho guest). Thêm checkbox "Gửi email khi trúng ngưỡng" + thêm hỗ trợ vàng (XAU). Hiển thị trạng thái email đã gửi.

## Bảo mật & validation
- Tất cả input validate Zod (length, format, regex).
- Rate-limit cơ bản theo email (đếm số submit trong 1 giờ ở DB).
- Suppression list đơn giản: `unsubscribed_at` cho newsletter; link unsubscribe có token HMAC.
- `CRON_SECRET` cho endpoint cron; `service_role` để bypass RLS server-side.

## Cron
- pg_cron chạy `select net.http_post(...)` mỗi 5 phút tới `/api/public/price-alerts-cron` với header `x-cron-secret`.

## Thứ tự thực hiện
1. Enable Cloud + migration tables + GRANT/RLS.
2. Mailgun helper + email templates (HTML brand).
3. Auth pages + welcome email trigger.
4. Newsletter widget + server route.
5. Contact form + server route.
6. Price alerts DB + cron + email.
7. Test gửi thử mỗi luồng.

## Lưu ý cho bạn
- Cần verify domain `marketwatch.vn` trên Mailgun đã thêm đủ SPF/DKIM/DMARC để email không vào spam.
- Nên dùng địa chỉ gửi như `noreply@marketwatch.vn` và reply-to `contact@marketwatch.vn`.
- Nếu Mailgun account là EU region, helper cần đổi base path (mình sẽ hỏi trước khi code nếu cần).