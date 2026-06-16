# MarketWatch Desktop (Electron)

Bọc site MarketWatch (https://marketwatch.vn) thành app desktop Windows/macOS/Linux có **file cài đặt thật** (`.exe` NSIS, `.dmg`, `.AppImage`, `.deb`).

## Build trên máy Windows

```powershell
mkdir .desktop-build
cd .desktop-build
'{"name":"marketwatch-desktop-build","version":"1.0.0","private":true}' | Out-File -Encoding utf8 package.json
npm install --no-audit --no-fund --ignore-scripts electron-builder@25
cd ..
mkdir build
copy public\favicon.ico build\icon.ico
copy public\icon-512.png build\icon.png
.\.desktop-build\node_modules\.bin\electron-builder.cmd --win --x64 --config electron-builder.yml --projectDir . --publish never
```

Output: `dist-electron/MarketWatch-Setup-<version>-x64.exe`

## Build qua GitHub Actions (khuyến nghị — không cần máy Windows)

Vào tab **Actions** → **Build Desktop App** → **Run workflow** → tải artifact.

Hoặc push tag để auto release:
```bash
git tag desktop-v1.0.0 && git push origin desktop-v1.0.0
```

## Chạy thử local

```bash
npm install --no-save electron
npx electron electron/main.cjs
```

Đổi URL: `MW_APP_URL=https://... npx electron electron/main.cjs`

## Icon (tuỳ chọn)

Đặt vào `build/`: `icon.ico` (Windows), `icon.icns` (macOS), `icon.png` 512×512 (Linux). Thiếu vẫn build được.

## Code signing (tuỳ chọn)

- Windows: cert ~$200-400/năm để khỏi SmartScreen warning.
- macOS: Apple Developer $99/năm để notarize.

Không có cert vẫn build, chỉ là user thấy cảnh báo "Unknown publisher".

## Cách hoạt động

App load thẳng `https://marketwatch.vn` — **mọi update web tự động phản ánh trong app**, không cần publish file cài đặt lại mỗi lần.
