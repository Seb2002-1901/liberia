import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Audit mobile STRICT — détecte les overflows au niveau ÉLÉMENT
 * (un overflow:hidden global peut cacher scrollWidth mais le
 * contenu reste tronqué à l'écran).
 *
 * Pour chaque page V3 à 375 px, on inspecte chaque élément visible
 * et on flag tous ceux dont .getBoundingClientRect().right
 * dépasse window.innerWidth + 1 px.
 */

const ROUTES = [
  { name: "home", path: "/" },
  { name: "demo", path: "/demo" },
  { name: "dashboard-v3", path: "/design-match/dashboard-v3" },
  { name: "coach-v3", path: "/design-match/coach-v3" },
  { name: "mon-analyse-v3", path: "/design-match/mon-analyse-v3" },
  { name: "plan-v3", path: "/design-match/plan-v3" },
  { name: "revenus-v3", path: "/design-match/revenus-v3" },
  { name: "depenses-v3", path: "/design-match/depenses-v3" },
  { name: "budget-v3", path: "/design-match/budget-v3" },
  { name: "objectifs-v3", path: "/design-match/objectifs-v3" },
  { name: "epargne-v3", path: "/design-match/epargne-v3" },
  { name: "opportunites-v3", path: "/design-match/opportunites-v3" },
  // investissements-v3 retiré (module masqué Sprint S1, redirect épargne)
  { name: "profil-v3", path: "/design-match/profil-v3" },
  { name: "parametres-v3", path: "/design-match/parametres-v3" },
  { name: "subscription", path: "/settings/subscription" },
] as const;

const SCREEN_DIR = join(process.cwd(), "tests/e2e/screenshots-strict");
test.beforeAll(() => mkdirSync(SCREEN_DIR, { recursive: true }));

const VIEWPORT = { width: 375, height: 667 };

for (const route of ROUTES) {
  test(`375x667 — ${route.name} overflow elements`, async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(800);

    const overflows = await page.evaluate((viewportWidth: number) => {
      const findOverflows = (): Array<{
        tag: string;
        right: number;
        width: number;
        left: number;
        text: string;
        attrs: string;
      }> => {
        const out: Array<{ tag: string; right: number; width: number; left: number; text: string; attrs: string }> = [];
        const all = document.querySelectorAll("*");
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.right > viewportWidth + 1 && rect.width > 0 && rect.height > 0) {
            // Ignore éléments fixed/absolute hors flux pertinent
            const cs = window.getComputedStyle(el);
            if (cs.position === "fixed" || cs.position === "absolute") continue;
            const text = (el.textContent ?? "").trim().slice(0, 40);
            const attrs = Array.from(el.attributes)
              .filter((a) => a.name.startsWith("data-") || a.name === "class")
              .map((a) => `${a.name}=${a.value.slice(0, 30)}`)
              .join(" ");
            out.push({
              tag: el.tagName.toLowerCase(),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              left: Math.round(rect.left),
              text,
              attrs,
            });
          }
        }
        return out.slice(0, 20);
      };
      return findOverflows();
    }, VIEWPORT.width);

    await page.screenshot({
      path: join(SCREEN_DIR, `${route.name}.png`),
      fullPage: true,
    });

    if (overflows.length > 0) {
      console.log(`\n  ❌ ${route.name} : ${overflows.length} éléments débordent à 375 px`);
      for (const o of overflows.slice(0, 5)) {
        console.log(`     <${o.tag}> right=${o.right} (+${o.right - 375}px) width=${o.width} attrs=[${o.attrs}] text="${o.text}"`);
      }
    } else {
      console.log(`  ✓ ${route.name} : aucun élément ne déborde`);
    }
  });
}
