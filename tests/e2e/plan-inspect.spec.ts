import { test } from "@playwright/test";

test("inspect plan-v3 header overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/design-match/plan-v3", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const all = document.querySelectorAll("*");
    const out: Array<{ width: number; right: number; tag: string; style: string; computedFlex: string; computedShrink: string }> = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width > 400 && r.width < 700) {
        const cs = window.getComputedStyle(el);
        out.push({
          width: Math.round(r.width),
          right: Math.round(r.right),
          tag: el.tagName.toLowerCase(),
          style: el.getAttribute("style") ?? "",
          computedFlex: cs.flex,
          computedShrink: cs.flexShrink,
        });
      }
    }
    return out;
  });

  for (const i of info) {
    console.log(`${i.tag} w=${i.width} right=${i.right} flex=${i.computedFlex} shrink=${i.computedShrink}`);
    console.log(`  style="${i.style.slice(0, 200)}"`);
  }
});
