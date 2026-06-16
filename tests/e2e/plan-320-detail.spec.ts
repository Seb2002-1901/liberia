import { test } from "@playwright/test";

test("plan-v3 320px residual overflows", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/design-match/plan-v3", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const list = await page.evaluate(() => {
    const out: Array<{ tag: string; right: number; width: number; left: number; text: string; style: string; computedWhiteSpace: string; computedFlex: string }> = [];
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.right > 321 && r.width > 0 && r.height > 0) {
        const cs = window.getComputedStyle(el);
        if (cs.position === "fixed" || cs.position === "absolute") continue;
        out.push({
          tag: el.tagName.toLowerCase(),
          right: Math.round(r.right),
          width: Math.round(r.width),
          left: Math.round(r.left),
          text: (el.textContent ?? "").trim().slice(0, 50),
          style: (el.getAttribute("style") ?? "").slice(0, 120),
          computedWhiteSpace: cs.whiteSpace,
          computedFlex: cs.flex,
        });
      }
    }
    return out;
  });

  console.log(`Plan-v3 @ 320px : ${list.length} overflows`);
  for (const o of list) {
    console.log(`  <${o.tag}> right=${o.right} w=${o.width} ws=${o.computedWhiteSpace} flex=${o.computedFlex}`);
    console.log(`     text="${o.text}"`);
    console.log(`     style="${o.style}"`);
  }
});
