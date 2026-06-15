import { test } from "@playwright/test";

test("inspect dashboard-v3 styles at 375", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/design-match/dashboard-v3", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const content = document.querySelector("[data-dash-content]");
    const main = document.querySelector("[data-dash-main]");
    const sidebar = document.querySelector("[data-dash-sidebar]");

    const get = (el: Element | null) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        rect: { left: rect.left, right: rect.right, width: rect.width },
        marginLeft: cs.marginLeft,
        display: cs.display,
        flex: cs.flex,
        position: cs.position,
        gridTemplateColumns: cs.gridTemplateColumns,
        overflow: cs.overflow,
        overflowX: cs.overflowX,
      };
    };

    return {
      viewportWidth: window.innerWidth,
      htmlScrollWidth: html.scrollWidth,
      htmlClientWidth: html.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      bodyOverflowX: window.getComputedStyle(body).overflowX,
      bodyWidth: window.getComputedStyle(body).width,
      content: get(content),
      main: get(main),
      sidebar: get(sidebar),
      sidebarParent: sidebar?.parentElement
        ? get(sidebar.parentElement)
        : null,
    };
  });

  console.log("DASHBOARD INSPECTION:", JSON.stringify(info, null, 2));
});
