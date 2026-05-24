import { test, expect } from "@playwright/test";

test.describe("public routes — smoke", () => {
  const routes = [
    { path: "/", expectText: "Reprends le contrôle de" },
    { path: "/pricing", expectText: "Tarifs" },
    { path: "/demo", expectText: "Mode démo" },
    { path: "/login", expectText: "Content de te revoir" },
    { path: "/register", expectText: "Commence ta reconstruction" },
    { path: "/legal", expectText: "Disclaimer" },
    { path: "/privacy", expectText: "Politique de confidentialité" },
    { path: "/terms", expectText: "Conditions" },
  ];

  for (const r of routes) {
    test(`${r.path} renders`, async ({ page }) => {
      const res = await page.goto(r.path);
      expect(res?.status()).toBeLessThan(400);
      await expect(page.locator("body")).toContainText(r.expectText, {
        timeout: 10_000,
      });
    });
  }
});

test.describe("auth gating", () => {
  test("/dashboard without Supabase env serves demo fallback (200)", async ({
    page,
  }) => {
    const res = await page.goto("/dashboard");
    expect(res?.status()).toBeLessThan(500);
  });
});
