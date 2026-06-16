import { test, expect } from "@playwright/test";

/**
 * Smoke tests for unauthenticated routes.
 *
 * On vérifie deux choses minimales :
 *   1. La route répond avec un statut < 400 (pas de 5xx).
 *   2. Le body contient "LIBERIA" — présent dans le topbar, le footer
 *      ou la sidebar de toutes les pages publiques quelle que soit la
 *      langue. Évite les assertions sur du copy localisé qui change
 *      à chaque itération éditoriale.
 *
 * Le test ne vise PAS à valider le contenu rédactionnel — c'est un
 * smoke check de routing. Les vraies validations visuelles vivent
 * dans mobile-strict / no-appshell-flash / vercel-real.
 */

test.describe("public routes — smoke", () => {
  const routes = ["/", "/pricing", "/demo", "/login", "/register", "/legal", "/privacy", "/terms"];

  for (const path of routes) {
    test(`${path} renders`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `${path} HTTP status`).toBeLessThan(400);
      await expect(page.locator("body"), `${path} body contains LIBERIA`).toContainText(
        "LIBERIA",
        { timeout: 10_000 },
      );
    });
  }
});

test.describe("auth gating", () => {
  /**
   * /dashboard est intercepté par le middleware et redirigé vers
   * /design-match/dashboard-v3 (fix flash AppShell). Sans Supabase
   * configuré, getFinanceData() retombe sur le profil démo → 200.
   * On vérifie juste qu'on ne crashe pas (status < 500).
   */
  test("/dashboard via middleware redirect (no 5xx)", async ({ page }) => {
    const res = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);
    // Après suivi des redirects, on doit arriver sur la cible V3
    // ou sur /login si Supabase est configuré + auth requise.
    const finalUrl = page.url();
    expect(
      finalUrl.includes("/design-match/dashboard-v3") || finalUrl.includes("/login"),
      `finalUrl=${finalUrl} ne correspond pas à V3 ou /login`,
    ).toBe(true);
  });
});
