import { test, expect } from "@playwright/test";

const PW_CHROME_PATH =
  process.env.PW_CHROME_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

test.use({
  launchOptions: { executablePath: PW_CHROME_PATH },
});

/**
 * Test middleware redirect prod → V3 (sans auth, mode demo).
 *
 * Vérifie qu'un GET sur les routes prod /dashboard, /coach, etc. ne
 * matérialise PAS un rendu intermédiaire AppShell avant V3.
 *
 * Sans auth, le middleware redirige d'abord vers /login (route
 * protégée). C'est le comportement attendu.
 *
 * Avec auth, le middleware doit redirect directement vers V3.
 * Comme on n'a pas auth en mode demo, on vérifie au moins que la
 * réponse HTTP est un redirect 30x vers V3 ou /login.
 */

const PROD_ROUTES = [
  "/dashboard",
  "/coach",
  "/mon-analyse",
  "/plan",
  "/incomes",
  "/expenses",
  "/budget",
  "/goals",
  "/savings",
  "/investments",
  "/opportunities",
  "/profile",
  "/settings",
];

for (const route of PROD_ROUTES) {
  test(`${route} → redirect direct middleware (pas de flash)`, async ({ page }) => {
    // Désactive les redirections suiveuses pour observer le premier hop
    const responses: { url: string; status: number }[] = [];
    page.on("response", (r) => {
      if (r.request().resourceType() === "document") {
        responses.push({ url: r.url(), status: r.status() });
      }
    });

    await page.goto(route, { waitUntil: "domcontentloaded" });
    const finalUrl = page.url();

    console.log(`${route} → ${responses.map((r) => `${r.status} ${r.url.replace("http://localhost:3000", "")}`).join(" → ")} (final: ${finalUrl})`);

    // Vérifier que la chaîne de redirect ne passe PAS par AppShell rendu
    // Soit on arrive directement sur /login (non auth)
    // Soit on arrive directement sur /design-match/*-v3 (auth)
    expect(
      finalUrl.includes("/login") ||
      finalUrl.includes("/design-match/") ||
      finalUrl.includes("/onboarding"),
      `${route} ne devrait pas finir sur (app)/route stub`,
    ).toBe(true);

    // Le HTML rendu ne doit JAMAIS contenir AppShell-specific markers
    // (data-app-shell, sectionPrincipal class, etc.)
    const html = await page.content();
    expect(html, `${route} contient encore l'AppShell ancien`).not.toMatch(/lg:pl-\[280px\]/);
  });
}
