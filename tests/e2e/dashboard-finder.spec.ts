import { test } from "@playwright/test";

test("find first overflowing element in dashboard-v3", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/design-match/dashboard-v3", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const widest = await page.evaluate(() => {
    const all = document.querySelectorAll("*");
    const out: Array<{
      tag: string;
      width: number;
      right: number;
      depth: number;
      attrs: string;
      inlineStyle: string;
      svgWidth: string | null;
      svgViewBox: string | null;
    }> = [];
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 400) {
        let depth = 0;
        let p: Element | null = el;
        while (p && depth < 30) {
          p = p.parentElement;
          depth++;
        }
        out.push({
          tag: el.tagName.toLowerCase(),
          width: Math.round(rect.width),
          right: Math.round(rect.right),
          depth,
          attrs: Array.from(el.attributes)
            .filter((a) => a.name === "class" || a.name.startsWith("data-"))
            .map((a) => `${a.name}=${a.value.slice(0, 30)}`)
            .join(" "),
          inlineStyle: el.getAttribute("style")?.slice(0, 120) ?? "",
          svgWidth: el.tagName.toLowerCase() === "svg" ? el.getAttribute("width") : null,
          svgViewBox: el.tagName.toLowerCase() === "svg" ? el.getAttribute("viewBox") : null,
        });
      }
    }
    return out.sort((a, b) => b.width - a.width).slice(0, 30);
  });

  console.log("WIDEST ELEMENTS:");
  for (const w of widest) {
    console.log(`  ${w.tag.padEnd(8)} w=${w.width.toString().padStart(4)} d=${w.depth} attrs=[${w.attrs}] style="${w.inlineStyle}" svg=${w.svgWidth}/${w.svgViewBox}`);
  }
});
