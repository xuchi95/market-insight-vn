# MarketWatch Native App + Home-Screen Widgets

Phần này là **code native iOS + Android** để bạn đóng gói site MarketWatch
thành app và publish lên App Store / Google Play, kèm **widget thật** hiển
thị giá vàng SJC, BTC, ETH, USD/VND ngay trên màn hình chính.

Lovable không build được file `.ipa` / `.aab` (không có Xcode / Android
Studio trong sandbox). Quy trình bên dưới chạy trên máy Mac (cho iOS) hoặc
bất kỳ máy nào có Android Studio (cho Android).

---

## 0. Chuẩn bị

- macOS + Xcode 15+ (chỉ cần cho iOS)
- Android Studio Hedgehog+ (chỉ cần cho Android)
- Apple Developer account ($99/năm) để publish App Store
- Google Play Console ($25 one-time) để publish Play Store
- Clone repo này về máy

---

## 1. Cài Capacitor platform

Trong thư mục gốc repo, sau khi `bun install`:

```bash
# Tạo project iOS
npx cap add ios

# Tạo project Android
npx cap add android

# Sync cấu hình + assets
npx cap sync
```

File `capacitor.config.ts` đã set sẵn `server.url = "https://marketwatch.vn"`,
nghĩa là app sẽ load thẳng site production — không cần build web mỗi lần
deploy. Đổi sang `webDir` build local nếu muốn offline shell.

---

## 2. iOS Widget (WidgetKit)

1. Mở `ios/App/App.xcworkspace` bằng Xcode.
2. **File → New → Target → Widget Extension**. Đặt tên `MarketWatchWidget`,
   bỏ tick "Include Configuration Intent" (mình dùng widget tĩnh).
3. Khi Xcode hỏi "Activate scheme", chọn **Activate**.
4. Xoá file `MarketWatchWidget.swift` Xcode tự tạo, copy file
   [`ios/MarketWatchWidget.swift`](./ios/MarketWatchWidget.swift) trong repo
   này vào folder `ios/App/MarketWatchWidget/` (cùng cấp với
   `MarketWatchWidgetBundle.swift`).
5. Trong target settings → **Signing & Capabilities**, set Team của bạn.
6. Build & Run (chọn scheme `MarketWatchWidget`). Trên máy thật, long-press
   home screen → "+" → tìm "MarketWatch" → chọn size Small / Medium.

Widget tự refresh mỗi 30 phút (iOS quyết định timing cuối cùng).

---

## 3. Android Widget (Glance)

1. Mở `android/` bằng Android Studio.
2. Mở `android/app/build.gradle`, thêm vào `dependencies`:

   ```gradle
   implementation "androidx.glance:glance-appwidget:1.1.0"
   implementation "androidx.glance:glance-material3:1.1.0"
   implementation "androidx.work:work-runtime-ktx:2.9.1"
   ```

3. Copy:
   - [`android/MarketWatchWidget.kt`](./android/MarketWatchWidget.kt) →
     `android/app/src/main/java/vn/marketwatch/app/widget/MarketWatchWidget.kt`
   - [`android/MarketWatchWidgetReceiver.kt`](./android/MarketWatchWidgetReceiver.kt) →
     cùng folder
   - [`android/widget_info.xml`](./android/widget_info.xml) →
     `android/app/src/main/res/xml/widget_info.xml`

4. Mở `android/app/src/main/AndroidManifest.xml`, thêm vào trong `<application>`:

   ```xml
   <receiver
       android:name=".widget.MarketWatchWidgetReceiver"
       android:exported="true">
       <intent-filter>
           <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
       </intent-filter>
       <meta-data
           android:name="android.appwidget.provider"
           android:resource="@xml/widget_info" />
   </receiver>
   ```

5. Build & Run. Long-press home screen → Widgets → MarketWatch.

---

## 4. Endpoint widget gọi

Cả 2 widget đều gọi:

```
GET https://marketwatch.vn/api/public/widget-snapshot
```

Response (<1KB):

```json
{
  "updatedAt": "2026-06-11T08:30:00.000Z",
  "items": [
    { "code": "SJC", "name": "Vàng SJC", "price": 78500000, "unit": "VND/lượng", "changePct": 0.42 },
    { "code": "BTC", "name": "Bitcoin", "price": 71234.5, "unit": "USD", "changePct": -1.2 },
    { "code": "ETH", "name": "Ethereum", "price": 3812.1, "unit": "USD", "changePct": 0.8 },
    { "code": "USD/VND", "name": "Đô la Mỹ", "price": 25430, "unit": "VND", "changePct": 0.05 }
  ]
}
```

Endpoint này không yêu cầu auth, đã có CDN cache 60s, an toàn để gọi từ
widget mọi user.

---

## 5. Submit lên store

- **iOS**: Xcode → Product → Archive → Distribute App → App Store Connect.
  Cần app icon 1024×1024 + screenshots + privacy policy URL
  (https://marketwatch.vn/chinh-sach-bao-mat).
- **Android**: Android Studio → Build → Generate Signed App Bundle → upload
  `.aab` lên Play Console.

App review thường mất 1-3 ngày.

---

## Lưu ý

- Widget OS quyết định timing refresh thực tế (iOS ~15-30 phút min, Android
  có thể set chính xác hơn). Đừng kỳ vọng realtime — widget là snapshot.
- Nếu muốn realtime, dùng Push Notification thay vì widget polling.
- Khi đổi `bundleId` / `appId`, nhớ đổi `capacitor.config.ts` + signing.