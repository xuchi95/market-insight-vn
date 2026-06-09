import { test, expect, type Page } from "@playwright/test";

/**
 * Kiểm thử tự động: các trang chứa bảng/danh sách không được tràn ngang
 * hoặc chồng đè nội dung ở mọi breakpoint quan trọng (mobile 360–430px,
 * tablet, desktop). Đây là regression test cho lỗi WatchlistPanel tràn
 * trên trang chủ ở 430px.
 *
 * Cách kiểm tra:
 *  1. document.documentElement.scrollWidth <= clientWidth (không có
 *     thanh scroll ngang ở body).
 *  2. Mọi <table> và mọi vùng có data-testid kết thúc bằng "-table"
 *     phải nằm trong viewport (right <= viewport width + tolerance) HOẶC
 *     được bọc bởi container có overflow-x:auto|scroll (cho phép cuộn nội bộ).
 */

const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 720 },
  { name: "desktop-1536", width: 1536, height: 864 },
];

const PAGES = [
  "/",
  "/gia-vang",
  "/tien-dien-tu",
  "/ty-gia-ngoai-te",
  "/ty-gia-ngan-hang",
  "/gia-xang-dau",
  "/chung-khoan",
  "/lai-suat-tiet-kiem",
];

const TOLERANCE_PX = 1.5;

async function measure(page: Page) {
  return await page.evaluate(() => {
    const docEl = document.documentElement;
    const vw = docEl.clientWidth;
    const scrollW = docEl.scrollWidth;

    // Find candidate "table-like" regions.
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'table, [role="table"], [data-testid$="-table"], [data-testid*="watchlist"]',
      ),
    );

    const offenders: Array<{
      tag: string;
      testid: string | null;
      right: number;
      width: number;
      scrollWidth: number;
      hasScrollableAncestor: boolean;
    }> = [];

    const isScrollable = (el: HTMLElement) => {
      const s = getComputedStyle(el);
      return /(auto|scroll)/.test(s.overflowX) || /(auto|scroll)/.test(s.overflow);
    };

    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // hidden
      // Check if any ancestor (up to body) allows horizontal scrolling.
      let p: HTMLElement | null = el.parentElement;
      let hasScrollableAncestor = false;
      while (p && p !== document.body) {
        if (isScrollable(p)) {
          hasScrollableAncestor = true;
          break;
        }
        p = p.parentElement;
      }
      const overflowsViewport = r.right > vw + 1.5 || r.left < -1.5;
      if (overflowsViewport && !hasScrollableAncestor) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          testid: el.getAttribute("data-testid"),
          right: r.right,
          width: r.width,
          scrollWidth: el.scrollWidth,
          hasScrollableAncestor,
        });
      }
    }

    return { vw, scrollW, offenders };
  });
}

for (const route of PAGES) {
  test.describe(`No overflow · ${route}`, () => {
    for (const vp of VIEWPORTS) {
      test(`${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        // Cho layout / data fetch settle.
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(400);

        const m = await measure(page);

        // 1. Body không có thanh scroll ngang.
        expect(
          m.scrollW,
          `Body tràn ngang ở ${route} @ ${vp.name}: scrollWidth=${m.scrollW}, clientWidth=${m.vw}`,
        ).toBeLessThanOrEqual(m.vw + TOLERANCE_PX);

        // 2. Không bảng/danh sách nào vượt viewport mà không có container cuộn.
        expect(
          m.offenders,
          `Có bảng/danh sách tràn viewport mà không có overflow-x scroll:\n` +
            JSON.stringify(m.offenders, null, 2),
        ).toEqual([]);
      });
    }
  });
}