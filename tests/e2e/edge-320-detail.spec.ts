import { test } from "@playwright/test";

for (const route of ["/", "/demo"]) {
  test(`${route} 320 overflows`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const list = await page.evaluate(() => {
      const out: Array<{ tag: string; right: number; width: number; text: string; style: string }> = [];
      for (const el of document.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.right > 321 && r.width > 0 && r.height > 0) {
          const cs = window.getComputedStyle(el);
          if (cs.position === "fixed" || cs.position === "absolute") continue;
          out.push({
            tag: el.tagName.toLowerCase(),
            right: Math.round(r.right),
            width: Math.round(r.width),
            text: (el.textContent ?? "").trim().slice(0, 60),
            style: (el.getAttribute("style") ?? "").slice(0, 80),
          });
        }
      }
      return out.slice(0, 10);
    });

    console.log(`${route} @ 320: ${list.length} overflows`);
    for (const o of list) {
      console.log(`  <${o.tag}> right=${o.right} w=${o.width} style="${o.style}" text="${o.text}"`);
    }
  });
}
