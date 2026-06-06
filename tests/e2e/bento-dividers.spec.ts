import { test, expect, type Page } from "@playwright/test";

/**
 * Visual regression: DOJI / PNJ / XAU/USD trong BentoTiles phải có 3 cột
 * cân đối với divider dọc thẳng hàng ở mọi breakpoint.
 *
 * Thay vì so sánh ảnh pixel-perfect (dễ flaky vì font/anti-alias),
 * test này đo bounding box của 3 ô GoldMini và xác nhận:
 *   - 3 ô có chiều rộng bằng nhau (tolerance 1px)
 *   - 3 ô có cùng top & cùng height (cùng hàng, cùng chiều cao)
 *   - 2 divider dọc (mép phải ô #1, mép phải ô #2) cách đều nhau
 *   - Tổng 3 ô lấp kín chiều ngang grid (không lệch)
 */

const BREAKPOINTS: { name: string; width: number; height: number }[] = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "mobile-landscape-812", width: 812, height: 375 },
  { name: "mobile-landscape-896", width: 896, height: 414 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-landscape-1024", width: 1024, height: 768 },
  { name: "laptop-1280", width: 1280, height: 720 },
  { name: "desktop-1536", width: 1536, height: 864 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];

const TOLERANCE_PX = 1.5;

async function measureGrid(page: Page) {
  return await page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>(
      '[data-testid="bento-gold-mini-grid"]',
    );
    if (!grid) return null;
    const cells = Array.from(
      grid.querySelectorAll<HTMLElement>('[data-testid="bento-gold-mini"]'),
    );
    if (cells.length !== 3) return null;
    const gridRect = grid.getBoundingClientRect();
    const cellRects = cells.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        label: el.getAttribute("data-label") ?? "",
        x: r.x,
        right: r.right,
        top: r.top,
        width: r.width,
        height: r.height,
      };
    });
    return { gridRect: { x: gridRect.x, right: gridRect.right, width: gridRect.width }, cellRects };
  });
}

const THEMES: Array<"light" | "dark"> = ["light", "dark"];

for (const theme of THEMES) {
  test.describe(`BentoTiles · gold mini dividers · ${theme} mode`, () => {
    test.beforeEach(async ({ context }) => {
      // Seed localStorage trước khi app khởi động để ThemeProvider pick up
      // đúng theme ngay từ first paint (tránh flash + tránh layout shift do
      // theme đổi sau hydration).
      await context.addInitScript((t) => {
        try {
          window.localStorage.setItem("mw-theme", t as string);
        } catch {}
      }, theme);
    });

    for (const bp of BREAKPOINTS) {
      test(`cân đối DOJI/PNJ/XAU ở ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.waitForSelector('[data-testid="bento-gold-mini-grid"]', {
          timeout: 15_000,
        });
        // Xác nhận theme đã apply (class trên <html>) để chắc chắn đang test
        // đúng dark/light mode chứ không phải fallback.
        await page.waitForFunction(
          (t) => document.documentElement.classList.contains(t as string),
          theme,
          { timeout: 5_000 },
        );
        // Cho layout settle (font, hydration)
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(200);

        const m = await measureGrid(page);
        expect(m, "không tìm thấy 3 ô GoldMini").not.toBeNull();
        const { gridRect, cellRects } = m!;
        const [a, b, c] = cellRects;

        // 1. Width bằng nhau
        expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(TOLERANCE_PX);
        expect(Math.abs(b.width - c.width)).toBeLessThanOrEqual(TOLERANCE_PX);

        // 2. Cùng hàng, cùng chiều cao
        expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(TOLERANCE_PX);
        expect(Math.abs(b.top - c.top)).toBeLessThanOrEqual(TOLERANCE_PX);
        expect(Math.abs(a.height - b.height)).toBeLessThanOrEqual(TOLERANCE_PX);
        expect(Math.abs(b.height - c.height)).toBeLessThanOrEqual(TOLERANCE_PX);

        // 3. Hai divider dọc cách đều nhau
        const gap1 = b.right - a.right;
        const gap2 = c.right - b.right;
        expect(Math.abs(gap1 - gap2)).toBeLessThanOrEqual(TOLERANCE_PX);

        // 4. Tổng 3 ô lấp kín chiều ngang grid
        expect(Math.abs(a.x - gridRect.x)).toBeLessThanOrEqual(TOLERANCE_PX);
        expect(Math.abs(c.right - gridRect.right)).toBeLessThanOrEqual(
          TOLERANCE_PX,
        );
      });
    }
  });
}