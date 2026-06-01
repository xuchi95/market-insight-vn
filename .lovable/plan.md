## Trang Admin `/mw-admin` — Kế hoạch xây dựng

Xây dựng một khu vực admin hoàn chỉnh tại `/mw-admin`, bảo vệ bằng role `admin` (đã có sẵn enum `app_role` + bảng `user_roles` + function `has_role`).

---

### 1. Bảo mật & truy cập

- Tạo layout route `src/routes/_admin.tsx` (pathless):
  - `beforeLoad` async: gọi server fn `requireAdmin` → nếu không phải admin thì `redirect('/')`.
  - Render shell admin (sidebar + outlet) với phong cách paper & ink + gold accent đồng bộ site.
- Tạo `src/routes/_admin/mw-admin.*` cho từng trang con:
  - `mw-admin.index.tsx` — Dashboard tổng quan
  - `mw-admin.users.tsx` — Quản lý user
  - `mw-admin.popups.tsx` — Quản lý popup
  - `mw-admin.broadcasts.tsx` — Gửi email thông báo
  - `mw-admin.newsletter.tsx` — Người đăng ký newsletter
  - `mw-admin.contact.tsx` — Inbox liên hệ
  - `mw-admin.settings.tsx` — Cấu hình hệ thống (rate limit, TTL email queue…)
- Server fn `requireAdmin` middleware: dùng `requireSupabaseAuth` + check `has_role(user.id, 'admin')` qua `supabaseAdmin`.

### 2. Quản lý user (`/mw-admin/users`)

Dùng `supabaseAdmin.auth.admin.*` API để có quyền đầy đủ.

Tính năng:
- Bảng list user: email, full_name, created_at, last_sign_in, banned status, role.
- Tìm kiếm theo email/tên, phân trang.
- Hành động mỗi user:
  - Sửa email (`auth.admin.updateUserById({ email })`)
  - Đặt mật khẩu trực tiếp (`updateUserById({ password })`)
  - Gửi email reset password (`resetPasswordForEmail`)
  - Ban / Unban (`updateUserById({ ban_duration: '876000h' | 'none' })`)
  - Sửa `full_name`, `locale` trong `profiles`
  - Cấp / thu hồi role admin (`user_roles` insert/delete)
  - Xóa user (`auth.admin.deleteUser`)
- Modal xác nhận cho hành động phá huỷ.

### 3. Quản lý popup newsletter (`/mw-admin/popups`)

Bảng mới `admin_popups`:
- `id`, `slug` (unique), `enabled`, `title`, `subtitle`, `body_md`, `cta_label`, `success_message`
- `theme` jsonb: `{ accent, background, textTone, layout: 'center'|'bottom'|'side', animation: 'fade'|'slide'|'pop' }`
- `fields` jsonb: mảng `[{name, label, type:'email'|'text'|'select', required, options?}]` — mặc định email
- `targeting` jsonb: `{ pages: string[], delaySeconds, scrollPercent, frequencyDays, hideForSubscribers }`
- `topics` text[]: chủ đề gán cho subscriber khi submit
- `starts_at`, `ends_at` nullable
- timestamps + `created_by`

RLS: chỉ admin (qua `has_role`) read/write; anon read các popup `enabled = true` (cho front-end).

Trang admin:
- CRUD đầy đủ: list, tạo, sửa, xoá, bật/tắt.
- Live preview popup ở bên phải khi chỉnh sửa.
- Có nút "Duplicate" để clone.

Front-end:
- Cập nhật `NewsletterPopup` để fetch popup `enabled` đầu tiên khớp targeting (page, delay, scroll, frequency), render dynamic fields, theme, animation.
- Submit qua server fn (giữ chống spam) → ghi vào `newsletter_subscribers` với `topics` & `source = 'popup:<slug>'`.

### 4. Gửi email broadcast (`/mw-admin/broadcasts`)

Bảng mới `admin_broadcasts`:
- `id`, `subject`, `body_md`, `audience` ('all_users' | 'newsletter' | 'admins' | 'custom_emails'),
- `custom_emails` text[], `topics_filter` text[]
- `status` ('draft'|'queued'|'sending'|'sent'|'failed'), `scheduled_at`, `sent_at`, `created_by`
- counters: `total`, `sent_count`, `failed_count`

Trang admin:
- Editor markdown (textarea) với preview render qua `react-markdown` (đã có UI tương tự ở template).
- Chọn audience, xem trước số người nhận.
- "Gửi thử tới email của tôi" trước khi gửi thật.
- Nút "Gửi ngay" → server fn `enqueueBroadcast`:
  - Resolve danh sách email theo audience.
  - Loại bỏ email trong `suppressed_emails`.
  - Render template (tái dùng infra email queue có sẵn) và enqueue mỗi recipient vào `transactional_emails`.
  - Cập nhật status broadcast.

### 5. Inbox newsletter & contact

- `/mw-admin/newsletter`: list `newsletter_subscribers` (email, topics, confirmed_at, source, unsubscribed_at), search, export CSV, gỡ subscriber.
- `/mw-admin/contact`: list `contact_submissions` (đã có RLS chặn read — sẽ thêm policy admin đọc), đánh dấu đã đọc (thêm cột `read_at`), xoá spam.

### 6. Dashboard (`/mw-admin`)

Hiển thị nhanh:
- Tổng số user, mới trong 7 ngày.
- Subscribers newsletter (active / unsub).
- Email gửi 24h / 7 ngày (từ `email_send_log`): sent / failed / dlq.
- Contact submissions chưa đọc.
- Popup hoạt động.

### 7. Cấu hình hệ thống (`/mw-admin/settings`)

- Form chỉnh `email_send_state` (batch_size, send_delay_ms, TTL).
- Toggle leaked-password check (qua `supabase--configure_auth`) — chỉ hiển thị note, vẫn cần admin chạy lệnh.
- (Sau này) toggle các flag site khác.

### 8. UI / UX

- Sidebar trái cố định với icon (lucide), header có breadcrumb + tên admin + nút logout.
- Bảng dùng `@/components/ui/table` với hover, zebra, sticky header.
- Dialog/drawer cho form chỉnh sửa.
- Toast (`sonner`) cho thành công/lỗi.
- Tông màu paper & ink + gold accent đã có trong `src/styles.css` — không thêm màu mới.

---

### Chi tiết kỹ thuật

- **Server fns**: tạo `src/lib/admin/*.functions.ts` cho users, popups, broadcasts, settings. Tất cả dùng middleware `requireAdmin` (compose `requireSupabaseAuth` + role check).
- **Admin client**: dùng `supabaseAdmin` từ `client.server` cho user management + bypass RLS khi cần (broadcasts, settings).
- **Migrations**: 1 migration tạo `admin_popups`, `admin_broadcasts`, thêm `read_at` vào `contact_submissions`, policy admin SELECT cho `contact_submissions` + `newsletter_subscribers`. Mọi bảng public mới có GRANT + RLS + policy.
- **Cấp admin đầu tiên**: do bạn chưa có admin nào, sau khi migration chạy mình sẽ insert role admin cho user_id mà bạn chỉ định (cần bạn cho email).

---

### Phạm vi loại trừ (sẽ hỏi nếu cần)

- Không xây dựng analytics nâng cao (chart funnel, retention). Dashboard chỉ là số đơn giản.
- Chưa làm logging audit hành động admin (có thể bổ sung sau).
- Chưa làm i18n cho UI admin — toàn bộ tiếng Việt.

---

### Câu hỏi cần xác nhận trước khi build

1. **Email admin đầu tiên** cần được cấp quyền `admin` là email nào?
2. Broadcast email có cần **lên lịch gửi sau** (scheduled_at) hay chỉ "gửi ngay"?
3. Popup có cần hỗ trợ **A/B testing** (nhiều biến thể) hay chỉ 1 popup active mỗi page?
4. Có muốn ghi **audit log** mọi hành động admin (đổi email, ban user…) ngay từ đầu không?