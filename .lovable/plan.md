# Kế hoạch triển khai 3 tính năng mới

## 1. Portfolio Tracker (`/portfolio`)

**Mô tả:** User đăng nhập → thêm tài sản (crypto/vàng) với số lượng & giá vốn → dashboard tổng giá trị realtime, % lãi/lỗ, phân bổ.

**Database (migration mới):**
- Bảng `portfolio_holdings`:
  - `user_id` (uuid, FK auth.users)
  - `asset_type` (enum: `crypto` | `gold`)
  - `symbol` (text — vd: `BTC`, `ETH`, `SJC`, `XAU`)
  - `quantity` (numeric)
  - `avg_cost_usd` (numeric, nullable — vàng dùng VND)
  - `avg_cost_vnd` (numeric, nullable)
  - `note` (text, nullable)
  - `created_at`, `updated_at`
- RLS: chỉ owner CRUD (`auth.uid() = user_id`)
- GRANT: `authenticated` + `service_role`

**Code:**
- Route `/portfolio` (yêu cầu đăng nhập, redirect `/dang-nhap` nếu chưa)
- Components:
  - `PortfolioSummary` — tổng giá trị, P/L tuyệt đối + %, biểu đồ tròn phân bổ (dùng Recharts đã có)
  - `HoldingsTable` — danh sách + nút Edit/Delete
  - `AddHoldingDialog` — form thêm/sửa (select asset từ list crypto/gold đã có)
- Tính giá realtime: dùng `fetchCryptoPrices` + `fetchGoldPrices` đã có, join theo symbol
- Link vào header dropdown user

## 2. DCA & ROI Calculator (`/cong-cu/dca-roi`)

**Mô tả:** Pure frontend, không cần DB.

**Tabs:**
- **DCA Calculator:** Nhập tài sản (BTC/ETH/SJC), số tiền/kỳ, tần suất (tuần/tháng), khoảng thời gian → kết quả: tổng đầu tư, số lượng tích lũy, giá trị hiện tại, ROI%. Dùng historical data từ `/api/public/crypto-chart` (đã có) hoặc nhập manual giá trung bình.
- **ROI Calculator:** Giá mua, giá bán, số lượng, phí → lợi nhuận tuyệt đối + %, ROI annualized.

**Components:**
- `DcaCalculator` + `RoiCalculator` với form + result card + biểu đồ tăng trưởng (Recharts AreaChart)

## 3. Lịch kinh tế (`/lich-kinh-te`)

**Mô tả:** Bảng các sự kiện kinh tế quan trọng (Fed FOMC, CPI Mỹ, NFP, GDP, lãi suất ECB...) ảnh hưởng đến vàng/USD/crypto.

**Data source:** Dùng API miễn phí từ Trading Economics calendar via scraping fallback, hoặc đơn giản nhất: **dữ liệu tĩnh JSON** (cập nhật thủ công hàng tháng) — đảm bảo hoạt động ngay, không phụ thuộc API có phí.
- File `src/lib/data/economicCalendar.ts` — mảng sự kiện với `date, time, country, event, impact (low/med/high), previous, forecast, actual, affects[]` (vd: `['gold','usd','btc']`).
- Server route `/api/public/economic-calendar` trả về JSON (cho phép sau này swap qua API thật).

**UI:**
- Filter: theo tuần này / tháng / mức ảnh hưởng / quốc gia
- Bảng: cờ quốc gia, ngày/giờ (Asia/Ho_Chi_Minh), tên sự kiện, mức ảnh hưởng (badge màu), dự báo, thực tế, tài sản ảnh hưởng
- Highlight sự kiện sắp diễn ra trong 24h

## Thứ tự thực hiện

1. **DCA/ROI Calculator** (đơn giản nhất, không DB) — làm trước để có quick win
2. **Lịch kinh tế** (data tĩnh, không DB)
3. **Portfolio Tracker** (cần migration + auth flow)

## Điều hướng

Thêm vào Header dropdown "Công cụ":
- Quy đổi tiền tệ (có sẵn)
- **Máy tính DCA & ROI** (mới)
- **Lịch kinh tế** (mới)
- **Danh mục của tôi** (mới — chỉ hiện khi đã login)

## Chi tiết kỹ thuật

- Portfolio dùng `createServerFn` + `requireSupabaseAuth` cho CRUD holdings
- DCA/ROI hoàn toàn client-side, không server
- Economic calendar v1 dùng JSON tĩnh embed trong code (~50-100 sự kiện cho 2-3 tháng tới), v2 có thể chuyển sang API
- SEO: mỗi trang có `head()` riêng với title/desc tiếng Việt + JSON-LD
- Realtime: Portfolio reuse cùng pattern fetch 30s như crypto/gold đã có

Sau khi bạn duyệt, tôi sẽ làm theo thứ tự 1→2→3 trong các turn riêng (hoặc gộp nếu bạn muốn nhanh).
