import { test, expect, type Page } from "@playwright/test";

/**
 * Verifies that no descriptive tooltip/label text appears when the user
 * hovers or focuses interactive elements anywhere in the site.
 *
 * Specifically asserts:
 *  - No HTML `title="..."` attributes on interactive elements (native tooltip)
 *  - No `aria-label="..."` attributes on interactive elements (a11y hint
 *    that some browsers surface visually on focus)
 *  - No Radix Tooltip / HoverCard popovers render after hover or focus
 *    (`[role="tooltip"]`, `[data-radix-popper-content-wrapper]` containing
 *     a tooltip, `.tooltip`, etc.)
 */

const ROUTES = [
  "/",
  "/ty-gia-ngoai-te",
  "/ty-gia-ngan-hang",
  "/gia-vang",
  "/tien-dien-tu",
  "/chung-khoan",
  "/quy-doi-tien-te",
  "/gia-xang-dau",
  "/lai-suat-tiet-kiem",
  "/lich-kinh-te",
  "/vi-mo-viet-nam",
  "/lien-he",
  "/dang-nhap",
  "/dang-ky",
];

const INTERACTIVE = [
  "button",
  "a[href]",
  "input",
  "textarea",
  "select",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[tabindex]:not([tabindex='-1'])",
];

async function collectStaticLabelOffenders(page: Page) {
  return await page.evaluate((selectors) => {
    const sel = selectors.join(",");
    const offenders: { tag: string; attr: string; value: string; outer: string }[] = [];
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      const t = el.getAttribute("title");
      if (t && t.trim() !== "") {
        offenders.push({ tag: el.tagName, attr: "title", value: t, outer: el.outerHTML.slice(0, 160) });
      }
      const a = el.getAttribute("aria-label");
      if (a && a.trim() !== "") {
        offenders.push({ tag: el.tagName, attr: "aria-label", value: a, outer: el.outerHTML.slice(0, 160) });
      }
    });
    return offenders;
  }, INTERACTIVE);
}

async function popoverCount(page: Page) {
  return await page.evaluate(() => {
    const sels = [
      "[role='tooltip']",
      "[data-radix-tooltip-content]",
      "[data-radix-hover-card-content]",
      ".tooltip",
    ];
    return document.querySelectorAll(sels.join(",")).length;
  });
}

for (const route of ROUTES) {
  test.describe(`Route ${route}`, () => {
    test("không có title/aria-label trên phần tử tương tác", async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      const offenders = await collectStaticLabelOffenders(page);
      expect(
        offenders,
        `Phát hiện ${offenders.length} nhãn mô tả trên ${route}:\n` +
          offenders.slice(0, 10).map((o) => `  - <${o.tag}> ${o.attr}="${o.value}"`).join("\n"),
      ).toEqual([]);
    });

    test("không hiển thị tooltip/popover khi hover & focus", async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});

      const handles = await page.locator(INTERACTIVE.join(",")).elementHandles();
      // Limit to first 30 to keep test runtime sane
      const sample = handles.slice(0, 30);

      for (const h of sample) {
        const visible = await h.isVisible().catch(() => false);
        if (!visible) continue;
        await h.hover({ force: true, timeout: 1000 }).catch(() => {});
        await h.focus().catch(() => {});
        // Radix tooltip default delay ~700ms; wait a bit longer.
        await page.waitForTimeout(900);
        const count = await popoverCount(page);
        expect(count, `Tooltip/popover xuất hiện sau hover/focus trên ${route}`).toBe(0);
        // Move focus/hover away
        await page.mouse.move(0, 0);
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      }
    });
  });
}