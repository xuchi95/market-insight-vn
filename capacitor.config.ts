import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "vn.marketwatch.app",
  appName: "MarketWatch",
  webDir: ".output/public",
  server: {
    // Trỏ thẳng app vào site production để không phải đóng gói lại web mỗi lần
    // deploy. Đổi sang `webDir` build khi muốn offline.
    url: "https://marketwatch.vn",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;