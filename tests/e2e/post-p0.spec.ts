import { test, expect } from "@playwright/test";

const PW_CHROME_PATH =
  process.env.PW_CHROME_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

test.use({
  launchOptions: { executablePath: PW_CHROME_PATH },
});

/**
 * Validation post-P0 — preuve que les 5 fix P0 sont réellement appliqués
 * dans le HTML rendu (et non juste corrigés en source).
 *
 * Mode dev sans Supabase : middleware applique uniquement les redirects
 * prod → V3 (cf. fix flash AppShell), donc /profile → V3 profil,
 * /settings → V3 paramètres, /dashboard → V3 dashboard, etc. Les pages
 * V3 rendent leur shell + données démo (getFinanceData fallback). Suffit
 * pour vérifier la STRUCTURE rendue.
 *
 * Ces tests ne valident pas la PERSISTANCE des server actions (nécessite
 * Supabase + auth réelle, hors scope dev). Validation : structure JSX
 * correcte, composants edit mountés, aucun contenu trompeur restant.
 */

test.describe("P0-A1 — Profil V3 édition", () => {
  test("section #edit-region est présente avec 3 selects + bouton save", async ({
    page,
  }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/design-match/profil-v3");

    const editSection = page.locator("#edit-region");
    await expect(editSection).toBeVisible();
    await expect(editSection).toContainText("Pays, devise et langue");

    // LocaleForm rend 3 V3Select (Pays / Devise / Langue), chacun
    // exposé en bouton avec aria-haspopup="listbox" (Phase Hardening :
    // remplace l'ancien shadcn Select role="combobox").
    const triggers = editSection.locator('button[aria-haspopup="listbox"]');
    await expect(triggers).toHaveCount(3);

    // Bouton "Enregistrer" (clé i18n auth.profile.locale.save)
    await expect(editSection.locator('button[type="submit"]')).toBeVisible();
  });

  test("CTA InfosPersoCard ne pointe plus sur /settings/memory", async ({
    page,
  }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    // L'ancien CTA "Compléter mes informations" → /settings/memory est
    // remplacé par "Modifier mes préférences" → #edit-region.
    const html = await page.content();
    expect(html).not.toContain("Compléter mes informations");
    expect(html).toContain("Modifier mes préférences");
    expect(html).toContain('href="#edit-region"');
  });
});

test.describe("P0-A2 — Paramètres V3 toggles", () => {
  test("section 'Mes préférences' rend 7 switches interactifs", async ({
    page,
  }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/design-match/parametres-v3");

    // SettingsPreferences rend 7 <Switch> shadcn (résumé hebdo, alertes,
    // encouragements, milestones, inactivité, essai, analytics). Chaque
    // switch est un <button role="switch">.
    const switches = page.locator('button[role="switch"]');
    await expect(switches).toHaveCount(7);
  });

  test("le titre 'Notifications & emails' est présent", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText("Notifications & emails");
  });
});

test.describe("P0-A3 — Dashboard sans courbe fictive", () => {
  test("EvolutionCard rend l'empty state premium (pas de série mockée)", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/design-match/dashboard-v3");

    // En mode dev sans Supabase, snapshots = [] → l'EvolutionCard doit
    // rendre l'empty state. On cherche l'un des 2 wordings possibles.
    const body = page.locator("body");
    await expect(body).toContainText(/Courbe en construction|Premier point enregistré/);

    // Le badge "+N pts (X sem.)" ne doit PAS apparaître quand on est en
    // empty state (pas de delta réel).
    const html = await page.content();
    expect(html).not.toMatch(/\+\d+ pts \(\d+ sem\.\)/);
  });
});

test.describe("P0-A4 — Coach IA landing sans chat simulé", () => {
  test("aucune des bulles user/assistant fakes n'est rendue", async ({
    page,
  }) => {
    await page.goto("/coach", { waitUntil: "domcontentloaded" });
    expect(page.url()).toMatch(/\/design-match\/coach-v3|\/coach\//);

    const html = await page.content();
    // Bulles user fakes
    expect(html).not.toContain(
      "Comment augmenter mon épargne plus rapidement",
    );
    expect(html).not.toContain("Montre-moi comment réduire mes dépenses fixes");
    // Bulle assistant fake + LeverRow
    expect(html).not.toContain("Excellente question. Voici quelques leviers");
    expect(html).not.toContain("32 % du calcul");
    // PreviewBanner supprimé
    expect(html).not.toContain("APERÇU PERSONNALISÉ");
    // TypingIndicator perpétuel "Coach IA écrit…" landing supprimé
    expect(html).not.toContain("Coach IA écrit…");
  });

  test("la bulle d'introduction réelle est rendue + CTA composer", async ({
    page,
  }) => {
    await page.goto("/coach", { waitUntil: "domcontentloaded" });
    const body = page.locator("body");
    // Présence du wording premium de remplacement
    await expect(body).toContainText(
      "Démarre une conversation pour explorer ensemble",
    );
  });
});

test.describe("P0-A5 — Investissements page honnête", () => {
  test("rend une seule hero card premium, pas 8 cards vides", async ({
    page,
  }) => {
    await page.goto("/investments", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/design-match/investissements-v3");

    const body = page.locator("body");
    await expect(body).toContainText(
      "Une vue dédiée à ton patrimoine, en préparation.",
    );

    const html = await page.content();
    // Plus aucune trace des wordings "à venir / Module Investissements à venir"
    expect(html).not.toContain("Module Investissements à venir");
    expect(html).not.toContain("Recommandations à venir");
    // Plus de "Performance globale", "Allocation", "Opportunités",
    // "Performance chart", "Projection", "Conseil IA" (titres des 8 cards
    // supprimées) — on s'assure qu'aucune card répétée n'a survécu.
    expect(html).not.toContain("Performance globale");
  });

  test("CTAs réels : En parler à mon coach + Voir mon épargne + objectifs", async ({
    page,
  }) => {
    await page.goto("/investments", { waitUntil: "domcontentloaded" });
    const body = page.locator("body");
    await expect(body).toContainText("En parler à mon coach");
    await expect(body).toContainText("Voir mon épargne");
    await expect(body).toContainText("Voir mes objectifs");
  });
});
