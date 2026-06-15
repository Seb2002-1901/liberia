import { test } from "@playwright/test";

test("demo 320 deep inspection", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/demo", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const out = await page.evaluate(() => {
    const o: Array<{ tag: string; cls: string; w: number; left: number; right: number; parent: string; text: string }> = [];
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.right > 321 && r.width > 0 && r.height > 0) {
        const cs = window.getComputedStyle(el);
        if (cs.position === "fixed" || cs.position === "absolute") continue;
        const parent = el.parentElement;
        const pcs = parent ? window.getComputedStyle(parent) : null;
        const pRect = parent?.getBoundingClientRect();
        o.push({
          tag: el.tagName.toLowerCase(),
          cls: el.className?.toString().slice(0, 100) ?? "",
          w: Math.round(r.width),
          left: Math.round(r.left),
          right: Math.round(r.right),
          parent: parent
            ? `<${parent.tagName.toLowerCase()} class="${parent.className?.toString().slice(0, 60)}" display=${pcs!.display} grid=${pcs!.gridTemplateColumns} w=${Math.round(pRect!.width)}>`
            : "",
          text: (el.textContent ?? "").trim().slice(0, 30),
        });
      }
    }
    return o.slice(0, 6);
  });

  for (const o of out) {
    console.log(`<${o.tag} class="${o.cls}"> w=${o.w} left=${o.left} text="${o.text}"`);
    console.log(`  parent: ${o.parent}`);
  }
});
