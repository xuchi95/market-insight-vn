import { test, expect, type Page } from "@playwright/test";

/**
 * Ngăn hồi quy "lớp lưới nền bị lặp khi chuyển Dark/Light".
 *
 * Trên một loạt trang quan trọng, đếm số phần tử có background-image
 * giống "lưới" (≥ 2 linear-gradient + background-size dạng ô nhỏ ≤ 200px)
 * ở từng theme, rồi toggle theme và đếm lại. Yêu cầu:
 *  1. Số lượng lưới sau toggle KHÔNG tăng (không bị lặp/chồng lớp).
 *  2. Toggle về theme ban đầu thì số lượng trở lại y nguyên.
 *  3. Không có 2 phần tử lưới chồng nhau cùng vị trí (stack thật trên DOM).
 */

const ROUTES = ["/", "/du-doan-gia-ai", "/dang-nhap", "/lien-he"];
const START_THEMES: Array<"light" | "dark"> = ["light", "dark"];

type GridHit = { selector: string; x: number; y: number; w: number; h: number };

async function countGridLayers(page: Page): Promise<GridHit[]> {
  return await page.evaluate(() => {
    const out: GridHit[] = [];
    const all = document.querySelectorAll<HTMLElement>("body *");
    all.forEach((el) => {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundImage;
      if (!bg || bg === "none") return;
      const gradients = (bg.match(/linear-gradient\(/g) ?? []).length;
      if (gradients < 2) return;
      const size = cs.backgroundSize || "";
      // Bắt mọi giá trị dạng "<n>px <n>px" với n ≤ 200 (lưới ô nhỏ lặp lại).
      const m = size.match(/(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px/);
      if (!m) return;
      const w = parseFloat(m[1]);
      const h = parseFloat(m[2]);
      if (w > 200 || h > 200) return;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") return;
      const id = el.id ? `#${el.id}` : "";
      const cls = el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      out.push({ selector: `${el.tagName.toLowerCase()}${id}${cls}`, x: r.x, y: r.y, w: r.width, h: r.height });
    });
    return out;
  });
}

async function waitTheme(page: Page, t: "light" | "dark") {
  await page.waitForFunction(
    (theme) => document.documentElement.classList.contains(theme as string),
    t,
    { timeout: 5_000 },
  );
  await page.waitForTimeout(150);
}

function findStacked(hits: GridHit[]): GridHit[][] {
  const groups: GridHit[][] = [];
  for (let i = 0; i < hits.length; i++) {
    for (let j = i + 1; j < hits.length; j++) {
      const a = hits[i], b = hits[j];
      // Stack: 2 hộp giao nhau ≥ 60% diện tích nhỏ hơn.
      const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      const inter = ix * iy;
      const small = Math.min(a.w * a.h, b.w * b.h);
      if (small > 0 && inter / small >= 0.6) groups.push([a, b]);
    }
  }
  return groups;
}

for (const start of START_THEMES) {
  test.describe(`Lưới nền không bị lặp khi toggle theme · bắt đầu ${start}`, () => {
    test.beforeEach(async ({ context }) => {
      await context.addInitScript((t) => {
        try { window.localStorage.setItem("mw-theme", t as string); } catch {}
      }, start);
    });

    for (const route of ROUTES) {
      test(`${route}`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await waitTheme(page, start);
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(200);

        const before = await countGridLayers(page);
        const stackedBefore = findStacked(before);
        expect(
          stackedBefore,
          `[${start}] ${route} đã có lưới chồng nhau trước khi toggle: ${JSON.stringify(stackedBefore)}`,
        ).toEqual([]);

        const toggle = page.locator('button[aria-pressed]:visible').first();
        // Một số trang (AuthShell) không hiển thị ThemeToggle — skip toggle nhưng vẫn assert stack.
        const hasToggle = (await toggle.count()) > 0;
        if (!hasToggle) return;

        const other = start === "dark" ? "light" : "dark";
        await toggle.click();
        await waitTheme(page, other);

        const after = await countGridLayers(page);
        expect(
          after.length,
          `[${start}→${other}] ${route} số lớp lưới tăng sau toggle (${before.length}→${after.length})`,
        ).toBeLessThanOrEqual(before.length);
        const stackedAfter = findStacked(after);
        expect(
          stackedAfter,
          `[${other}] ${route} có 2 lưới chồng nhau sau toggle: ${JSON.stringify(stackedAfter)}`,
        ).toEqual([]);

        // Toggle về lại theme gốc — phải trùng số lượng ban đầu (đối xứng).
        await toggle.click();
        await waitTheme(page, start);
        const back = await countGridLayers(page);
        expect(
          back.length,
          `[${other}→${start}] ${route} không đối xứng (${before.length} vs ${back.length})`,
        ).toBe(before.length);
      });
    }
  });
}