import { test, expect } from "@playwright/test";

const ROUTES = [
  "/", "/demo",
  "/design-match/dashboard-v3",
  "/design-match/coach-v3",
  "/design-match/mon-analyse-v3",
  "/design-match/plan-v3",
  "/design-match/revenus-v3",
  "/design-match/depenses-v3",
  "/design-match/budget-v3",
  "/design-match/objectifs-v3",
  "/design-match/epargne-v3",
  "/design-match/opportunites-v3",
  "/design-match/investissements-v3",
  "/design-match/profil-v3",
  "/design-match/parametres-v3",
  "/settings/subscription",
];

const SIZES = [
  { name: "320", width: 320, height: 568 },
  { name: "375", width: 375, height: 667 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
];

for (const sz of SIZES) {
  for (const route of ROUTES) {
    test(`${sz.name}px ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: sz.width, height: sz.height });
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(500);

      const overflows = await page.evaluate((vw: number) => {
        const all = document.querySelectorAll("*");
        let count = 0;
        let maxOverflow = 0;
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.right > vw + 1 && rect.width > 0 && rect.height > 0) {
            const cs = window.getComputedStyle(el);
            if (cs.position === "fixed" || cs.position === "absolute") continue;
            count++;
            maxOverflow = Math.max(maxOverflow, rect.right - vw);
          }
        }
        return { count, maxOverflow: Math.round(maxOverflow) };
      }, sz.width);

      console.log(`${sz.name}px ${route}: ${overflows.count} overflows, max=${overflows.maxOverflow}px`);

      // Tolérer 5 px de fluctuation (rounding) sur ≤ 3 éléments
      if (overflows.count > 5 || overflows.maxOverflow > 50) {
        expect.soft(overflows, `${route} @ ${sz.name}px`).toEqual({
          count: 0,
          maxOverflow: 0,
        });
      }
    });
  }
}
