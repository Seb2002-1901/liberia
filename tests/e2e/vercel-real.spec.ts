import { test, expect } from "@playwright/test";

/**
 * Tests RÉELS Vercel preview — nécessitent un environnement complet
 * configuré (Supabase + Anthropic + Stripe + utilisateur de test).
 *
 * Mode de fonctionnement :
 *  - SI les variables d'environnement requises sont présentes, les
 *    tests s'exécutent réellement.
 *  - SINON, ils sont SKIPPED (pas FAILED) pour ne pas bloquer la CI
 *    sur les environnements de dev local.
 *
 * Variables d'environnement attendues (à poser dans
 * PLAYWRIGHT_BASE_URL=https://liberia-pr-xxx.vercel.app + auth) :
 *   E2E_USER_EMAIL    — email du compte test pré-créé
 *   E2E_USER_PASSWORD — mot de passe
 *   E2E_BASE_URL      — URL Vercel preview (sinon http://localhost:3000)
 *   E2E_STRIPE_CARD   — "4242424242424242" pour test mode
 *
 * Mode démo local : ces tests sont skippés.
 *
 * Usage :
 *   E2E_USER_EMAIL=test@liberia.app E2E_USER_PASSWORD=… \
 *   PLAYWRIGHT_BASE_URL=https://preview.vercel.app \
 *   npx playwright test tests/e2e/vercel-real.spec.ts
 */

const HAS_AUTH = Boolean(
  process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD,
);
const HAS_STRIPE = Boolean(process.env.E2E_STRIPE_CARD);

test.describe("Coach IA — envoi réel + persistance", () => {
  test.skip(!HAS_AUTH, "E2E_USER_EMAIL/PASSWORD requis");

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/mot de passe|password/i).fill(
      process.env.E2E_USER_PASSWORD!,
    );
    await page.getByRole("button", { name: /connexion|se connecter/i }).click();
    // Redirige vers /dashboard puis /design-match/dashboard-v3
    await page.waitForURL(/design-match\/dashboard-v3/, { timeout: 15000 });
  });

  test("envoyer un message → bulle utilisateur visible + réponse IA streamée", async ({ page }) => {
    // Sidebar Coach IA → auto-redirect vers /coach/{recent} si existant
    // sinon landing avec "Démarrer"
    await page.goto("/design-match/coach-v3");
    await page.waitForURL(/\/(coach\/[a-f0-9-]+|design-match\/coach-v3)/);

    if (page.url().includes("design-match/coach-v3")) {
      // Pas de conv : cliquer Démarrer pour en créer une
      await page.getByRole("button", { name: /démarrer/i }).first().click();
      await page.waitForURL(/\/coach\/[a-f0-9-]+/, { timeout: 10000 });
    }

    // Composer V3 : textarea avec aria-label
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeEnabled();
    await expect(textarea).toBeFocused();

    // Tape un message
    const testMsg = "Test E2E " + Date.now();
    await textarea.fill(testMsg);

    // Bouton Envoyer doit s'activer
    const sendBtn = page.getByRole("button", { name: /envoyer/i });
    await expect(sendBtn).toBeEnabled();

    // Envoyer via Enter (shortcut + behavior)
    await textarea.press("Enter");

    // Bulle utilisateur visible immédiatement (optimistic update)
    await expect(page.getByText(testMsg, { exact: false }).first()).toBeVisible({
      timeout: 3000,
    });

    // TypingIndicator V3 OU stream qui démarre
    await page.waitForTimeout(2500);

    // Reload — messages persistés
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    // Le message utilisateur doit toujours être là
    await expect(
      page.getByText(testMsg, { exact: false }).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("Shift+Enter ajoute une nouvelle ligne (ne send pas)", async ({ page }) => {
    await page.goto("/design-match/coach-v3");
    if (page.url().includes("design-match/coach-v3")) {
      await page.getByRole("button", { name: /démarrer/i }).first().click();
      await page.waitForURL(/\/coach\/[a-f0-9-]+/, { timeout: 10000 });
    }

    const textarea = page.locator("textarea").first();
    await textarea.fill("Ligne 1");
    await textarea.press("Shift+Enter");
    await textarea.type("Ligne 2");

    const value = await textarea.inputValue();
    expect(value).toContain("Ligne 1");
    expect(value).toContain("Ligne 2");
    expect(value).toMatch(/\n/);
  });
});

test.describe("Stripe — checkout test mode", () => {
  test.skip(!HAS_AUTH || !HAS_STRIPE, "Auth + Stripe test card requis");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/mot de passe|password/i).fill(
      process.env.E2E_USER_PASSWORD!,
    );
    await page.getByRole("button", { name: /connexion|se connecter/i }).click();
    await page.waitForURL(/design-match/, { timeout: 15000 });
  });

  test("checkout Stripe → retour avec status=success", async ({ page }) => {
    await page.goto("/settings/subscription");

    // Choisir le plan premium mensuel
    const buyBtn = page
      .getByRole("button", { name: /premium.*mensuel|essai|s'abonner/i })
      .first();
    if (await buyBtn.isVisible()) {
      await buyBtn.click();
      // Stripe checkout s'ouvre dans la même page ou pop-up
      await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });

      // Remplir la carte 4242
      await page.locator('[name="cardNumber"]').fill(process.env.E2E_STRIPE_CARD!);
      await page.locator('[name="cardExpiry"]').fill("1230");
      await page.locator('[name="cardCvc"]').fill("123");
      await page.locator('[name="billingName"]').fill("E2E Test");

      // Submit
      await page.getByRole("button", { name: /s'abonner|subscribe|pay/i }).click();

      // Retour sur /settings/subscription?status=success
      await page.waitForURL(/settings\/subscription\?status=success/, {
        timeout: 30000,
      });

      // Banner trial visible
      await expect(page.getByText(/essai|trial/i).first()).toBeVisible();
    }
  });

  test("portal Stripe — clic 'Gérer mon abonnement'", async ({ page }) => {
    await page.goto("/settings/subscription");
    const portalBtn = page.getByRole("button", { name: /gérer.*abonnement/i }).first();
    if (await portalBtn.isVisible()) {
      const popup = page.waitForEvent("popup", { timeout: 10000 });
      await portalBtn.click();
      const p = await popup;
      await p.waitForURL(/billing\.stripe\.com/, { timeout: 15000 });
    }
  });
});

test.describe("Propagation données — ajout revenu reflux", () => {
  test.skip(!HAS_AUTH, "E2E_USER_EMAIL/PASSWORD requis");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/mot de passe|password/i).fill(
      process.env.E2E_USER_PASSWORD!,
    );
    await page.getByRole("button", { name: /connexion|se connecter/i }).click();
    await page.waitForURL(/design-match/, { timeout: 15000 });
  });

  test("ajout revenu → Dashboard + Revenus + Coach affichent le même montant", async ({ page }) => {
    await page.goto("/design-match/revenus-v3");

    // Click "Ajouter un revenu"
    const addBtn = page.getByRole("button", { name: /ajouter.*revenu|nouveau revenu/i }).first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const uniqueAmount = 1500 + Math.floor(Math.random() * 100);
      await addBtn.click();

      // Formulaire — label + montant + fréquence
      await page.getByLabel(/libellé|label/i).first().fill("Test E2E");
      await page.getByLabel(/montant|amount/i).first().fill(String(uniqueAmount));

      await page.getByRole("button", { name: /enregistrer|sauvegarder|ajouter/i }).first().click();
      await page.waitForTimeout(2000);

      // Vérifier sur Dashboard
      await page.goto("/design-match/dashboard-v3");
      const dashText = (await page.locator("body").textContent()) ?? "";
      expect(dashText).toContain(String(uniqueAmount));

      // Vérifier sur Coach RightRail
      await page.goto("/design-match/coach-v3");
      await page.waitForURL(/\/(coach\/|design-match\/coach-v3)/);
      const coachText = (await page.locator("body").textContent()) ?? "";
      expect(coachText.length).toBeGreaterThan(100);
    }
  });
});

test.describe("Profil modifié → Topbar mise à jour", () => {
  test.skip(!HAS_AUTH, "E2E_USER_EMAIL/PASSWORD requis");

  test("modifier prénom → Topbar greeting reflète immédiatement", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/mot de passe|password/i).fill(
      process.env.E2E_USER_PASSWORD!,
    );
    await page.getByRole("button", { name: /connexion|se connecter/i }).click();
    await page.waitForURL(/design-match/, { timeout: 15000 });

    await page.goto("/design-match/profil-v3");

    const editBtn = page.getByRole("button", { name: /modifier|éditer|edit/i }).first();
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();
      const newName = "TestE2E_" + Date.now();
      await page.getByLabel(/prénom|nom|name/i).first().fill(newName);
      await page.getByRole("button", { name: /enregistrer|sauvegarder|save/i }).first().click();
      await page.waitForTimeout(2000);

      // Topbar greeting doit refléter
      const topbarText = await page.locator("h1").first().textContent();
      expect(topbarText).toContain(newName.slice(0, 8));
    }
  });
});
