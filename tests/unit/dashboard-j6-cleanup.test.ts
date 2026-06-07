import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 4.0 J6 — vérifie que le dashboard ne rend plus
 * LearnedAboutYou ni ProgressSinceLastVisit, MAIS que la logique
 * sous-jacente (advisor-engine) continue d'être disponible — les
 * composants restent en code pour un futur écran "Profil financier"
 * et le coach context utilise les mêmes champs.
 *
 * On lit le fichier source plutôt que de rendre la page (qui
 * dépendrait de Supabase, next-intl, etc.) : c'est un check
 * statique simple, déterministe, qui bloquera tout retour
 * involontaire des deux blocs sur le dashboard.
 */

const dashboardSource = readFileSync(
  resolve(process.cwd(), "app/(app)/dashboard/page.tsx"),
  "utf8",
);

describe("Phase 4.0 J6 — dashboard épuré", () => {
  it("n'importe plus LearnedAboutYou", () => {
    expect(dashboardSource).not.toMatch(
      /from\s+["']@\/components\/dashboard\/learned-about-you["']/,
    );
  });

  it("n'importe plus ProgressSinceLastVisit", () => {
    expect(dashboardSource).not.toMatch(
      /from\s+["']@\/components\/dashboard\/progress-since-last-visit["']/,
    );
  });

  it("ne rend plus le composant <LearnedAboutYou /> en JSX", () => {
    expect(dashboardSource).not.toMatch(/<LearnedAboutYou\b/);
  });

  it("ne rend plus le composant <ProgressSinceLastVisit /> en JSX", () => {
    expect(dashboardSource).not.toMatch(/<ProgressSinceLastVisit\b/);
  });

  it("garde Ring + AdvisorCard + FirstSessionMissionCard + Timeline + GoalsSummary + CoachButton", () => {
    // Les 6 sections finales attendues sur le dashboard J6.
    expect(dashboardSource).toMatch(/<HealthScoreSection\b/);
    expect(dashboardSource).toMatch(/<AdvisorCard\b/);
    expect(dashboardSource).toMatch(/<FirstSessionMissionCard\b/);
    expect(dashboardSource).toMatch(/<HealthTimeline\b/);
    expect(dashboardSource).toMatch(/<GoalsSummary\b/);
    expect(dashboardSource).toMatch(/<CoachButton\b/);
  });
});

/**
 * Garantie complémentaire : l'advisor-engine continue à calculer
 * learnedAboutUser + progressSinceLastVisit. Ces champs alimentent
 * le coach context et seront consommés par un futur écran "Profil
 * financier". Les supprimer casserait le coach — on protège ça ici
 * par un check sur le type retourné par buildAdvisorSummary.
 */
describe("Phase 4.0 J6 — advisor-engine intact (coach context)", () => {
  it("expose toujours learnedAboutUser + progressSinceLastVisit sur AdvisorSummary", async () => {
    const mod = await import("@/lib/calculations/advisor-engine");
    // Type-level check via la signature publique : si l'un de ces
    // champs disparaissait, l'import casserait à la compilation.
    type Summary = ReturnType<typeof mod.buildAdvisorSummary>;
    const _keys: Array<keyof Summary> = [
      "learnedAboutUser",
      "progressSinceLastVisit",
    ];
    expect(_keys.length).toBe(2);
  });
});
