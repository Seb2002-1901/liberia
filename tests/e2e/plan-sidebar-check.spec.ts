import { test } from "@playwright/test";

test("plan-v3 sidebar visibility at 375", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/design-match/plan-v3", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const sidebar = await page.evaluate(() => {
    const el = document.querySelector("[data-plan-sidebar]");
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const aside = el.querySelector("aside");
    const asideCs = aside ? window.getComputedStyle(aside) : null;
    const asideRect = aside?.getBoundingClientRect();
    return {
      wrapper: {
        display: cs.display,
        width: rect.width,
        left: rect.left,
        right: rect.right,
        visibility: cs.visibility,
      },
      aside: aside
        ? {
            display: asideCs!.display,
            position: asideCs!.position,
            width: asideRect!.width,
            left: asideRect!.left,
            visibility: asideCs!.visibility,
          }
        : null,
    };
  });

  console.log("PLAN SIDEBAR:", JSON.stringify(sidebar, null, 2));
});
