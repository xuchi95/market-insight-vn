## Phạm vi method được tích hợp

Trong 9 method bạn enable trên AuthSignal, có 3 cái **không dùng được trên web thuần** (cần native mobile app marketwatch.vn — hiện chưa có):
- ❌ **Push verification** — cần app native nhận push (FCM/APNs)
- ❌ **In-app verification** — cần app native render UI verify
- ❌ **QR code verification** — cần thiết bị thứ 2 đã login bằng app native quét QR

→ Sẽ **bỏ qua** 3 cái này. Khi nào có mobile app sẽ thêm sau.

**5 method sẽ tích hợp:**
| Method | Trạng thái |
|---|---|
| Authenticator app (TOTP) | ✅ Đã có, giữ nguyên |
| Recovery codes | ✅ Đã có (đi kèm TOTP) |
| 📱 SMS OTP | Mới — dùng SpeedSMS (đã có secret) |
| 📧 Email OTP | Mới — dùng Resend (đã có webhook) |
| 🔗 Email magic link | Mới — dùng Resend (đã có webhook) |
| 🔑 Passkey (WebAuthn) | Mới — dùng AuthSignal Server SDK |

## Use case

### 1. Quản lý phương thức (`/cai-dat/bao-mat`)
Rework trang hiện tại thành dashboard tổng:
- List 5 method với trạng thái On/Off, ngày enroll, nút Enroll/Remove
- Mỗi method có flow enroll riêng (modal hoặc inline panel tiếng Việt):
  - **TOTP**: như hiện tại (QR + 6 số)
  - **SMS OTP**: nhập số điện thoại → gửi OTP qua SpeedSMS → nhập 6 số xác minh
  - **Email OTP**: nhập email (mặc định email tài khoản) → gửi OTP → nhập 6 số
  - **Magic Link**: nhập email → gửi link → user click link để verify
  - **Passkey**: bấm "Tạo passkey" → trình duyệt prompt Face ID/Touch ID/Windows Hello
- Recovery codes: nút "Tạo lại 8 mã" (yêu cầu verify 1 method khác trước)
- Cho phép đặt **method mặc định** dùng cho step-up

### 2. Step-up khi đăng nhập (rework `/xac-thuc-2fa`)
Sau khi nhập mật khẩu đúng:
- Nếu user có ≥1 method → hiện màn "Chọn phương thức xác thực"
- Mỗi tile = 1 method đã enroll (TOTP, SMS, Email OTP, Magic Link, Passkey, Recovery code)
- User chọn → render form verify tương ứng → server fn `verifyMfaChallenge` accept mọi loại code

### 3. Step-up cho hành động nhạy cảm
Tạo hook `useStepUpVerification()` + component `<StepUpDialog />`:
- Trả Promise — caller `await stepUp({ action: "change-password" })`
- Modal mở ra, user chọn method + nhập code → resolve hoặc reject
- Áp dụng cho 3 chỗ:
  - `/cai-dat/mat-khau` (đổi mật khẩu)
  - `/cai-dat/index` khi đổi email
  - Xóa method MFA trong trang Bảo mật

## Technical

### Database
Đổi `user_mfa` (hiện chỉ lưu 1 authenticator) thành `user_mfa_methods` 1-n:
```
user_mfa_methods(
  id, user_id, type ('totp'|'sms'|'email_otp'|'magic_link'|'passkey'),
  authsignal_user_id, authenticator_id, label (số đt mask / email),
  is_default, enrolled, enrolled_at, created_at
)
user_mfa_backup_codes(user_id, codes[])  -- giữ riêng
```
Migration sẽ chuyển dữ liệu TOTP cũ sang.

### Server functions (`src/lib/mfa.functions.ts` mở rộng)
- `listMfaMethods()` — list tất cả method đã enroll
- `startSmsEnrollment({phone})` / `confirmSmsEnrollment({code})`
- `startEmailOtpEnrollment({email})` / `confirmEmailOtpEnrollment({code})`
- `startMagicLinkEnrollment({email})` (AuthSignal tự gửi qua webhook `/api/public/authsignal-magic-link` đã có)
- `startPasskeyEnrollment()` → trả challenge → client gọi `navigator.credentials.create()` → `confirmPasskeyEnrollment({attestation})`
- `removeMfaMethod({methodId})` (yêu cầu verify trước)
- `setDefaultMfaMethod({methodId})`
- `challengeMfa({methodId})` — start verify (gửi SMS/Email)
- `verifyMfaChallenge({methodId, code|assertion})` — accept mọi loại
- `regenerateBackupCodes()`

Mọi flow đi qua AuthSignal Server API (`api.authsignal.com/v1/users/{id}/authenticators`) bằng `AUTHSIGNAL_API_SECRET` — không gọi gì từ client trừ WebAuthn ceremony.

### SMS sending
SMS OTP của AuthSignal cần provider. Hai lựa chọn:
- **A**: Cấu hình AuthSignal Portal → SMS provider = Webhook → URL `/api/public/authsignal-sms` (mình tạo mới, dùng SpeedSMS đã có secret)
- **B**: Mình tự sinh OTP, gửi SpeedSMS, verify nội bộ (không dùng AuthSignal cho SMS)

Khuyến nghị A để thống nhất với Email OTP đã làm.

### Passkey
Dùng AuthSignal Passkey API:
- Server: `POST /users/{id}/authenticators` với `verificationMethod: "PASSKEY"` → trả `options` (PublicKeyCredentialCreationOptions)
- Client: `navigator.credentials.create({publicKey: options})` → gửi attestation lên server
- Server: `POST /users/{id}/authenticators/verify` với attestation
- Verify ngược: `POST /users/{id}/authenticators/challenge` → assertion → `verify`

### Routes mới / sửa
- ✏️ `src/routes/cai-dat.bao-mat.tsx` — rework thành dashboard
- ➕ `src/components/security/MethodCard.tsx` + 5 panel enroll
- ➕ `src/components/security/StepUpDialog.tsx` + hook
- ✏️ `src/routes/xac-thuc-2fa.tsx` — multi-method selector
- ➕ `src/routes/api/public/authsignal-sms.ts` — webhook SMS provider
- ➕ `src/routes/cai-dat.bao-mat.magic-link-callback.tsx` — handle magic link click khi enroll

## Khối lượng & đề xuất chia nhỏ

Đây là ~15-20 file mới/sửa, ~1500-2000 dòng code. Để dễ review & test, mình đề xuất chia làm **4 PR tuần tự**:

1. **PR1 (foundation)**: Migration DB, refactor `mfa.functions.ts` thành multi-method, rework UI trang Bảo mật dạng list — giữ TOTP hoạt động như cũ. *(~1 ngày code)*
2. **PR2 (SMS + Email OTP)**: Thêm 2 method này + webhook SMS provider. *(~1 ngày)*
3. **PR3 (Magic Link + Passkey)**: Thêm 2 method này. *(~1 ngày)*
4. **PR4 (Step-up framework)**: `StepUpDialog`, áp vào login + đổi password + đổi email. Rework `/xac-thuc-2fa`. *(~1 ngày)*

## Câu cần bạn quyết

1. **Có OK bỏ Push / In-app / QR** (cần mobile app native) không?
2. **SMS provider** — đi hướng A (AuthSignal webhook → SpeedSMS) hay B (tự xử lý)?
3. **Bắt đầu từ PR1** ngay, hay làm liền 1 lượt cả 4 (lâu hơn nhưng 1 lần xong)?