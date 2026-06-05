# @marketwatch/sdk

Client TypeScript cho MarketWatch realtime API — vàng, tiền điện tử, xăng dầu, chứng khoán VN.
Chạy trên **browser**, **Node 18+**, **Bun**, **Deno**.

## Cài đặt

```bash
npm install @marketwatch/sdk
# hoặc
bun add @marketwatch/sdk
```

## Khởi tạo

```ts
import { createMarketWatchClient } from "@marketwatch/sdk";

const mw = createMarketWatchClient({
  apiKey: "mw_live_xxx",             // xin từ admin marketwatch.vn
  baseUrl: "https://marketwatch.vn", // (tùy chọn)
});
```

## Snapshot 1 lần (REST)

```ts
const snap = await mw.getSnapshot({ scopes: ["gold", "crypto"] });
console.log(snap.data.gold?.items);
console.log(snap.data.crypto?.coins);
```

## Stream realtime (SSE)

```ts
const stop = mw.stream({
  scopes: ["gold", "crypto", "fuel", "stocks"],
  interval: 10, // 5–60 giây
  onOpen:    (info) => console.log("Connected:", info),
  onSnapshot:(s)    => {
    console.log("Gold:",   s.data.gold?.items?.[0]);
    console.log("BTC:",    s.data.crypto?.coins?.find((c) => c.symbol === "btc"));
    console.log("VNINDEX:",s.data.stocks?.items?.find((i) => i.code === "VNINDEX"));
  },
  onError:   (e) => console.error(e),
  onClose:   (r) => console.log("Closed:", r),
});

// Khi không dùng nữa:
stop();
```

- SDK tự **reconnect** khi mất kết nối (delay 2s).
- Server tự đóng sau 30 phút → SDK reconnect trong suốt với app.

## Scopes

| Scope    | Trường dữ liệu chính                              |
|----------|---------------------------------------------------|
| `gold`   | `items[]` — SJC, PNJ, DOJI, BTMC, XAU/USD…        |
| `crypto` | `coins[]` — top coin theo CoinGecko + giá VND     |
| `fuel`   | `items[]` — giá xăng RON95/E5, dầu DO theo vùng   |
| `stocks` | `items[]` — VNINDEX, VN30, HNX, HNX30, UPCOM      |

Key chỉ trả về scope đã được cấp quyền — request scope ngoài quyền sẽ bị bỏ qua.

## License

MIT
## Publishing

Local (requires `npm login` or `NPM_TOKEN`):

```bash
# Inside packages/marketwatch-sdk
npm run release           # typecheck + build + publish current version
npm run release:dry       # full dry-run, no publish

# Bump version first, then publish
bash ../../scripts/publish-sdk.sh patch   # or minor / major
```

Manual version bump only:

```bash
npm run version:patch   # 0.1.0 -> 0.1.1
npm run version:minor   # 0.1.0 -> 0.2.0
npm run version:major   # 0.1.0 -> 1.0.0
```

CI: push a tag `sdk-vX.Y.Z` or run the **Publish SDK** GitHub Action manually.
Requires repo secret `NPM_TOKEN`.

The publish script always runs in this order and aborts on first failure:
1. npm auth check
2. `npm install`
3. `npm run typecheck` (tsc --noEmit)
4. `npm run build` (clean + tsc)
5. Verify `dist/index.js` and `dist/index.d.ts` exist
6. Check version not already on npm
7. `npm pack --dry-run` preview
8. `npm publish --access public`
