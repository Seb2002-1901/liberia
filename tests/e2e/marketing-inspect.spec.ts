import { test } from "@playwright/test";

test("marketing / 320 inspect", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const out: Array<{ tag: string; classes: string; right: number; width: number; left: number; gridCols: string }> = [];
    const cards = document.querySelectorAll("[style*='border-radius:14px']");
    cards.forEach((c) => {
      const r = c.getBoundingClientRect();
      if (r.right > 321) {
        let p = c.parentElement;
        let gridParent = "";
        let depth = 0;
        while (p && depth < 5) {
          const cs = window.getComputedStyle(p);
          if (cs.display === "grid") {
            gridParent = `<${p.tagName.toLowerCase()} class="${(p.className ?? "").slice(0, 80)}" cols="${cs.gridTemplateColumns}" width=${p.getBoundingClientRect().width}>`;
            break;
          }
          p = p.parentElement;
          depth++;
        }
        out.push({
          tag: c.tagName.toLowerCase(),
          classes: c.className ?? "",
          right: Math.round(r.right),
          width: Math.round(r.width),
          left: Math.round(r.left),
          gridCols: gridParent,
        });
      }
    });
    return out;
  });
  for (const i of info) {
    console.log(`<${i.tag}> right=${i.right} w=${i.width} left=${i.left}`);
    console.log(`  grid parent: ${i.gridCols}`);
  }
});
