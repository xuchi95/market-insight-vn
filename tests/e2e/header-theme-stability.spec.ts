import { test, expect, type Page } from "@playwright/test";

/**
 * Đảm bảo khi bấm Dark/Light toggle trong Header, bố cục menu chính và
 * thanh quick-search KHÔNG bị lệch, jump, hay scrollbar shift.
 *
 * Đo bounding box của:
 *  - <header> (chiều cao + width)
 *  - container nav desktop (data-testid="header-nav")
 *  - cụm toolbar (data-testid="header-toolbar")
 *  - search trigger (data-testid="header-search-trigger") khi đóng
 *  - search form + input (data-testid="header-search-form") khi mở
 * trước và sau khi toggle theme, rồi so sánh trong tolerance.
 */

const TOLERANCE_PX = 1.5;

const DESKTOP_VIEWPORTS = [
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-landscape-812", width: 812, height: 375 },
  { name: "mobile-landscape-896", width: 896, height: 414 },
  { name: "laptop-1280", width: 1280, height: 720 },
  { name: "desktop-1536", width: 1536, height: 864 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];

const MOBILE_VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "mobile-landscape-568", width: 568, height: 320 },
];

const THEMES: Array<"light" | "dark"> = ["light", "dark"];

type Rect = { x: number; y: number; width: number; height: number; right: number; bottom: number };

async function rectOf(page: Page, selector: string): Promise<Rect | null> {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  }, selector);
}

function expectRectEqual(a: Rect, b: Rect, label: string) {
  expect(Math.abs(a.x - b.x), `${label}.x`).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(a.y - b.y), `${label}.y`).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(a.width - b.width), `${label}.width`).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(a.height - b.height), `${label}.height`).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(a.right - b.right), `${label}.right`).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(a.bottom - b.bottom), `${label}.bottom`).toBeLessThanOrEqual(TOLERANCE_PX);
}

for (const theme of THEMES) {
  test.describe(`Header layout ổn định khi toggle theme · bắt đầu ${theme}`, () => {
    test.beforeEach(async ({ context }) => {
      await context.addInitScript((t) => {
        try {
          window.localStorage.setItem("mw-theme", t as string);
        } catch {}
      }, theme);
    });

    for (const vp of DESKTOP_VIEWPORTS) {
      test(`không lệch ở ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.waitForSelector('[data-testid="site-header"]', { timeout: 15_000 });
        await page.waitForFunction(
          (t) => document.documentElement.classList.contains(t as string),
          theme,
          { timeout: 5_000 },
        );
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(200);

        // ==== Pha 1: search đóng — đo header, nav, toolbar, search trigger ====
        const before1 = {
          header: await rectOf(page, '[data-testid="site-header"]'),
          nav: await rectOf(page, '[data-testid="header-nav"]'),
          toolbar: await rectOf(page, '[data-testid="header-toolbar"]'),
          trigger: await rectOf(page, '[data-testid="header-search-trigger"]'),
        };
        for (const [k, v] of Object.entries(before1)) {
          expect(v, `pha 1 thiếu ${k}`).not.toBeNull();
        }

        const toggle = page.locator('button[aria-pressed]:visible').first();
        await toggle.waitFor({ state: "visible", timeout: 5_000 });
        const otherTheme = theme === "dark" ? "light" : "dark";
        await toggle.click();
        await page.waitForFunction(
          (t) => document.documentElement.classList.contains(t as string),
          otherTheme,
          { timeout: 5_000 },
        );
        await page.waitForTimeout(200);

        const after1 = {
          header: await rectOf(page, '[data-testid="site-header"]'),
          nav: await rectOf(page, '[data-testid="header-nav"]'),
          toolbar: await rectOf(page, '[data-testid="header-toolbar"]'),
          trigger: await rectOf(page, '[data-testid="header-search-trigger"]'),
        };
        expectRectEqual(after1.header!, before1.header!, "header (closed)");
        expectRectEqual(after1.nav!, before1.nav!, "nav (closed)");
        expectRectEqual(after1.toolbar!, before1.toolbar!, "toolbar (closed)");
        expectRectEqual(after1.trigger!, before1.trigger!, "search trigger (closed)");

        // Toggle lần 2 để chắc đối xứng (đảo lại theme ban đầu).
        await toggle.click();
        await page.waitForFunction(
          (t) => document.documentElement.classList.contains(t as string),
          theme,
          { timeout: 5_000 },
        );
        await page.waitForTimeout(200);
        const back1 = {
          header: await rectOf(page, '[data-testid="site-header"]'),
          toolbar: await rectOf(page, '[data-testid="header-toolbar"]'),
        };
        expectRectEqual(back1.header!, before1.header!, "header (closed/back)");
        expectRectEqual(back1.toolbar!, before1.toolbar!, "toolbar (closed/back)");

        // ==== Pha 2: mở search rồi toggle theme — form + toolbar phải giữ nguyên ====
        await page.locator('[data-testid="header-search-trigger"]').click();
        await page.waitForSelector('[data-testid="header-search-form"]', { timeout: 5_000 });
        // Chờ animation slide-in (200ms) settle.
        await page.waitForTimeout(300);
        // Mất focus để đóng suggest dropdown (tránh ảnh hưởng layout đo).
        await page.locator('[data-testid="site-header"]').click({ position: { x: 5, y: 5 } });
        await page.waitForTimeout(150);
        // Click lại trigger nếu blur đã đóng form (nếu q rỗng nó tự đóng).
        const formVisible = await page.locator('[data-testid="header-search-form"]').count();
        if (formVisible === 0) {
          await page.locator('[data-testid="header-search-trigger"]').click();
          await page.waitForSelector('[data-testid="header-search-form"]', { timeout: 5_000 });
          await page.waitForTimeout(300);
        }
        // Gõ ký tự để form không bị blur-close khi toggle.
        const input = page.locator('[data-testid="header-search-form"] input');
        await input.fill("btc");
        // Đóng suggest dropdown bằng Escape (giữ form mở vì q ≠ rỗng).
        await input.press("Escape");
        await page.waitForTimeout(150);

        const before2 = {
          header: await rectOf(page, '[data-testid="site-header"]'),
          toolbar: await rectOf(page, '[data-testid="header-toolbar"]'),
          form: await rectOf(page, '[data-testid="header-search-form"]'),
        };
        for (const [k, v] of Object.entries(before2)) {
          expect(v, `pha 2 thiếu ${k}`).not.toBeNull();
        }

        await toggle.click();
        const otherTheme2 = theme === "dark" ? "light" : "dark";
        await page.waitForFunction(
          (t) => document.documentElement.classList.contains(t as string),
          otherTheme2,
          { timeout: 5_000 },
        );
        await page.waitForTimeout(200);

        const after2 = {
          header: await rectOf(page, '[data-testid="site-header"]'),
          toolbar: await rectOf(page, '[data-testid="header-toolbar"]'),
          form: await rectOf(page, '[data-testid="header-search-form"]'),
        };
        expectRectEqual(after2.header!, before2.header!, "header (search open)");
        expectRectEqual(after2.toolbar!, before2.toolbar!, "toolbar (search open)");
        expectRectEqual(after2.form!, before2.form!, "search form (search open)");
      });
    }
  });
}
