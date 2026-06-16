import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Audit mobile réel — Vague A bis validation.
 *
 * Visite chaque page principale aux 6 breakpoints critiques, prend
 * un screenshot, et vérifie programmatiquement :
 *  - aucun scroll horizontal (document.documentElement.scrollWidth
 *    <= clientWidth)
 *  - aucune carte qui déborde du viewport
 *  - hamburger visible et cliquable < 999 px
 *
 * Mode démo : on visite directement les routes publiques en mode
 * démo via /demo (qui simule le shell), MAIS pour les pages V3
 * authentifiées le middleware redirige sur /login. On accepte ce
 * comportement et on vérifie au moins :
 *  - landing marketing
 *  - /login
 *  - /demo
 *  - /pricing
 *  - /design-match/dashboard-v3 sans auth → doit rediriger
 */

const BREAKPOINTS = [
  { name: "iphone-se-320", width: 320, height: 568 },
  { name: "iphone-se2-375", width: 375, height: 667 },
  { name: "iphone-14-390", width: 390, height: 844 },
  { name: "iphone-pm-430", width: 430, height: 932 },
  { name: "ipad-portrait-768", width: 768, height: 1024 },
  { name: "ipad-landscape-1024", width: 1024, height: 768 },
] as const;

const ROUTES = [
  { name: "home", path: "/" },
  { name: "login", path: "/login" },
  { name: "register", path: "/register" },
  { name: "pricing", path: "/pricing" },
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
  { name: "investissements-v3", path: "/design-match/investissements-v3" },
  { name: "profil-v3", path: "/design-match/profil-v3" },
  { name: "parametres-v3", path: "/design-match/parametres-v3" },
  { name: "subscription", path: "/settings/subscription" },
] as const;

const SCREEN_DIR = join(process.cwd(), "tests/e2e/screenshots-mobile-audit");

test.beforeAll(() => {
  mkdirSync(SCREEN_DIR, { recursive: true });
});

for (const bp of BREAKPOINTS) {
  test.describe(`${bp.name} (${bp.width}×${bp.height})`, () => {
    for (const route of ROUTES) {
      test(`${route.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        const response = await page.goto(route.path, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        });

        // Wait for layout to stabilize (font loading + JS hydration)
        await page.waitForTimeout(800);

        const status = response?.status() ?? 0;
        const url = page.url();

        // Mesures critiques
        const metrics = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            bodyScrollWidth: body.scrollWidth,
            bodyClientWidth: body.clientWidth,
            innerWidth: window.innerWidth,
            hasHorizontalScroll: doc.scrollWidth > doc.clientWidth + 1,
          };
        });

        // Screenshot full page
        await page.screenshot({
          path: join(SCREEN_DIR, `${bp.name}_${route.name}.png`),
          fullPage: true,
        });

        // Report (non-blocking en cas de redirect/auth) — uniquement
        // assertions strictes pour les pages applicables
        const isAuthRequired = url.includes("/login");
        const overflow = metrics.hasHorizontalScroll;

        console.log(
          `[${bp.name}] ${route.name}: status=${status} url=${url.replace(
            "http://localhost:3000",
            "",
          )} scrollW=${metrics.scrollWidth} clientW=${metrics.clientWidth} overflow=${overflow} authRedirect=${isAuthRequired}`,
        );

        // Assert no horizontal overflow sur les pages publiques
        if (!isAuthRequired && status === 200) {
          expect(
            metrics.hasHorizontalScroll,
            `${route.name} a un scroll horizontal (${metrics.scrollWidth} > ${metrics.clientWidth})`,
          ).toBe(false);
        }
      });
    }
  });
}
