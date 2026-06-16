import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 4.0 J7 — page Analytics épurée.
 *
 * Check statique : on lit la source du client analytics et on vérifie
 * que les sections masquées (breakdown détaillé, économies
 * potentielles, historique catégorie) sont effectivement gardées
 * SOUS un flag désactivé, MAIS que leur code reste en place — la
 * logique métier (useMemo) doit continuer à exister pour un retour
 * rapide via le flag, et pour ne pas casser l'advisor-engine /
 * coach context qui partagent les helpers purs.
 *
 * On évite un rendu DOM (qui dépendrait de next-intl + un wrapper de
 * provider) : un check source est déterministe et rapide.
 */

const analyticsSource = readFileSync(
  resolve(process.cwd(), "components/finance/expense-analytics-client.tsx"),
  "utf8",
);

// Phase Stabilisation : la page a été migrée hors de (app)/ pour
// utiliser le shell V3 inline (cf. components/layout/v3-shell.tsx)
// et harmoniser la sidebar avec "Mon analyse" visible. La logique
// (rendu d'ExpenseAnalyticsClient) est strictement préservée.
const analyticsPageSource = readFileSync(
  resolve(process.cwd(), "app/expenses/analytics/page.tsx"),
  "utf8",
);

describe("Phase 4.0 J7 — Analytics épuré (mask UX, code conservé)", () => {
  it("expose un flag SHOW_DETAILED_SECTIONS désactivé par défaut", () => {
    // Le flag doit exister et valoir false. Si quelqu'un le passe à
    // true sans repasser par un cycle produit, le test casse pour
    // forcer la conversation. Si le nom du flag change, le test
    // casse aussi pour bloquer une dérive silencieuse.
    expect(analyticsSource).toMatch(
      /const\s+SHOW_DETAILED_SECTIONS\s*=\s*false\s*;/,
    );
  });

  it("garde les 4 sections principales selon la priorité produit", () => {
    // Ordre attendu (priorité produit) :
    //   1. CompletenessCard
    //   2. OpportunitiesCard
    //   3. Card budgets (CardTitle référençant t('budgets.title'))
    //   4. Période + Fixed/Variable
    const completenessIdx = analyticsSource.indexOf("<CompletenessCard");
    const opportunitiesIdx = analyticsSource.indexOf("<OpportunitiesCard");
    const budgetsIdx = analyticsSource.indexOf('t("budgets.title")');
    const periodIdx = analyticsSource.indexOf('t("period.title")');

    expect(completenessIdx).toBeGreaterThan(-1);
    expect(opportunitiesIdx).toBeGreaterThan(-1);
    expect(budgetsIdx).toBeGreaterThan(-1);
    expect(periodIdx).toBeGreaterThan(-1);

    // Complétude → Opportunités → Budgets → Période.
    expect(completenessIdx).toBeLessThan(opportunitiesIdx);
    expect(opportunitiesIdx).toBeLessThan(budgetsIdx);
    expect(budgetsIdx).toBeLessThan(periodIdx);
  });

  it("masque BreakdownList, PotentialSavingsCard, CategoryHistoryCard sous le flag", () => {
    // Les 3 composants masqués doivent être rendus UNIQUEMENT à
    // l'intérieur du bloc conditionnel SHOW_DETAILED_SECTIONS. On
    // vérifie qu'ils apparaissent après le marqueur du bloc et pas
    // ailleurs dans le JSX rendu inconditionnellement.
    const flagBlockIdx = analyticsSource.indexOf("SHOW_DETAILED_SECTIONS && (");
    expect(flagBlockIdx).toBeGreaterThan(-1);

    const beforeFlag = analyticsSource.slice(0, flagBlockIdx);

    // Aucun de ces composants ne doit être rendu en JSX avant le
    // bloc masqué (ils ne sont autorisés que dans le bloc).
    expect(beforeFlag).not.toMatch(/<BreakdownList\b/);
    expect(beforeFlag).not.toMatch(/<PotentialSavingsCard\b/);
    expect(beforeFlag).not.toMatch(/<CategoryHistoryCard\b/);

    // En revanche, après le flag, on doit retrouver les 3 (pour qu'un
    // simple flip du flag rétablisse les sections sans refactor).
    const afterFlag = analyticsSource.slice(flagBlockIdx);
    expect(afterFlag).toMatch(/<BreakdownList\b/);
    expect(afterFlag).toMatch(/<PotentialSavingsCard\b/);
    expect(afterFlag).toMatch(/<CategoryHistoryCard\b/);
  });

  it("conserve les imports et helpers des sections masquées (code preservé)", () => {
    // Les imports doivent rester pour que le code conditionnel
    // compile et reste réactivable. Si quelqu'un supprime ces
    // imports en "nettoyant", le code masqué casse silencieusement
    // — ce test bloque cette dérive.
    expect(analyticsSource).toMatch(/buildCategoryHistory/);
    expect(analyticsSource).toMatch(/computePotentialSavings/);
    expect(analyticsSource).toMatch(/buildCategoryBreakdown/);
    // Et les sous-composants définis plus bas dans le fichier.
    expect(analyticsSource).toMatch(/function BreakdownList\b/);
    expect(analyticsSource).toMatch(/function PotentialSavingsCard\b/);
    expect(analyticsSource).toMatch(/function CategoryHistoryCard\b/);
  });

  it("page analytics serveur inchangée (toujours pilote l'ExpenseAnalyticsClient)", () => {
    // La page route reste un fin wrapper : aucun refactor majeur.
    expect(analyticsPageSource).toMatch(/<ExpenseAnalyticsClient\b/);
  });
});
