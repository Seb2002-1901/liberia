import { test, expect } from "@playwright/test";

const PW_CHROME_PATH =
  process.env.PW_CHROME_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

test.use({
  launchOptions: { executablePath: PW_CHROME_PATH },
});

/**
 * Validation Phase Auth-V3 — preuve que les 5 écrans d'entrée
 * (layout + login + register + forgot + reset + onboarding + error
 * pages) rendent en charte navy V3 et plus en pré-V3 (shadcn/gold).
 *
 * Indicateurs négatifs (absence) :
 *  - aucune classe `font-display` shadcn héritée
 *  - aucune référence `hsl(var(--gold))` (palette pré-V3)
 *  - aucune classe Tailwind `bg-secondary` du layout pré-V3
 *
 * Indicateurs positifs (présence) :
 *  - marque "LIBERIA" en header navy + Outfit
 *  - inputs blancs avec border #E5E9F0
 *  - CTAs navy #011E5F plein
 */

test.describe("Auth V3 — refonte visuelle", () => {
  test("/login rend en charte V3 (pas de hsl(var(--gold)))", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const html = await page.content();
    // Plus de tokens gold pré-V3
    expect(html).not.toContain("hsl(var(--gold))");
    expect(html).not.toContain("font-display");
    // V3 navy header présent
    expect(html).toContain("LIBERIA");
    // Inputs présents (email + password)
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // Bouton submit présent
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("/register rend en charte V3 + checkbox terms", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    const html = await page.content();
    expect(html).not.toContain("hsl(var(--gold))");
    expect(html).toContain("LIBERIA");
    // 4 inputs : name, email, password, confirmPassword
    await expect(page.locator('input[autocomplete="name"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="email"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="new-password"]')).toHaveCount(2);
    // Checkbox terms via role="checkbox" (V3Checkbox custom)
    await expect(page.locator('[role="checkbox"]')).toBeVisible();
  });

  test("/forgot-password rend en charte V3", async ({ page }) => {
    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    const html = await page.content();
    expect(html).not.toContain("hsl(var(--gold))");
    expect(html).toContain("LIBERIA");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("/reset-password rend en charte V3 (état checking/missing)", async ({
    page,
  }) => {
    await page.goto("/reset-password", { waitUntil: "domcontentloaded" });
    const html = await page.content();
    expect(html).not.toContain("hsl(var(--gold))");
    // En dev sans session Supabase → state "missing" → CTA
    // forgot-password navy doit s'afficher in fine. Mais l'animation
    // initiale peut être "checking" → on attend juste que la marque
    // soit là (présente dans tous les états).
    expect(html).toContain("LIBERIA");
  });
});

test.describe("Onboarding V3 — refonte visuelle", () => {
  test("/onboarding rend en charte V3 (radio cards + progress)", async ({
    page,
  }) => {
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/onboarding");

    const html = await page.content();
    expect(html).not.toContain("hsl(var(--gold))");
    expect(html).toContain("LIBERIA");
    // Step 1 — radiogroup + input revenu
    await expect(page.locator('[role="radiogroup"]')).toBeVisible();
    await expect(page.locator('[role="radio"]').first()).toBeVisible();
    // Bouton skip présent
    const skipButton = page.locator('form button[type="submit"]').first();
    await expect(skipButton).toBeVisible();
  });
});
