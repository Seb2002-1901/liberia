import { describe, expect, it } from "vitest";
import {
  buildFirstMission,
  type BuildFirstMissionInput,
} from "@/lib/calculations/first-mission";
import type { HealthRecommendation } from "@/lib/calculations/health/types";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const baseRecommendation: HealthRecommendation = {
  targetAxis: "resilience",
  titleKey: "recommend_build_runway",
  descriptionKey: "recommend_build_runway_desc",
  payload: { addAmount: 1500, gainMonths: 1 },
  estimatedGain: 4,
};

/** Profil "tout va bien" pour partir d'une base neutre dans chaque
 *  test. On dérive en variant un seul champ pour isoler le critère
 *  déclencheur. */
function happyProfile(): BuildFirstMissionInput {
  return {
    goalsCount: 1,
    runwayMonths: 3,
    hasCurrentSavings: true,
    filledMajorAreasCount: 5,
    missingMajorArea: null,
    recommendation: null,
  };
}

/* -------------------------------------------------------------------------- */
/*  A. Aucun objectif → priority no_goal                                       */
/* -------------------------------------------------------------------------- */

describe("buildFirstMission — priorité A : aucun objectif", () => {
  it("renvoie no_goal quand goalsCount = 0", () => {
    const r = buildFirstMission({ ...happyProfile(), goalsCount: 0 });
    expect(r.priority).toBe("no_goal");
  });

  it("no_goal pointe vers /goals", () => {
    const r = buildFirstMission({ ...happyProfile(), goalsCount: 0 });
    expect(r.ctaHref).toBe("/goals");
  });

  it("priorité A bat priorité B (low_resilience) si les deux sont vrais", () => {
    // Pas d'objectif ET pas de coussin → on demande l'objectif d'abord.
    const r = buildFirstMission({
      ...happyProfile(),
      goalsCount: 0,
      hasCurrentSavings: false,
      runwayMonths: 0,
    });
    expect(r.priority).toBe("no_goal");
  });

  it("priorité A bat priorité C (incomplete_expenses) si les deux sont vrais", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      goalsCount: 0,
      filledMajorAreasCount: 2,
      missingMajorArea: "insurance",
    });
    expect(r.priority).toBe("no_goal");
  });
});

/* -------------------------------------------------------------------------- */
/*  B. Résilience faible → priority low_resilience                            */
/* -------------------------------------------------------------------------- */

describe("buildFirstMission — priorité B : résilience faible", () => {
  it("renvoie low_resilience quand savings = 0", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      hasCurrentSavings: false,
    });
    expect(r.priority).toBe("low_resilience");
  });

  it("renvoie low_resilience quand runway < 1 mois", () => {
    const r = buildFirstMission({ ...happyProfile(), runwayMonths: 0.5 });
    expect(r.priority).toBe("low_resilience");
  });

  it("passe palier B à runway = 1 mois exactement (seuil inclusif)", () => {
    const r = buildFirstMission({ ...happyProfile(), runwayMonths: 1 });
    expect(r.priority).not.toBe("low_resilience");
  });

  it("low_resilience pointe vers /coach", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      hasCurrentSavings: false,
    });
    expect(r.ctaHref).toBe("/coach");
  });

  it("payload contient runwayMonths arrondi à 1 décimale", () => {
    const r = buildFirstMission({ ...happyProfile(), runwayMonths: 0.275 });
    expect(r.payload.runwayMonths).toBe(0.3);
  });

  it("priorité B bat priorité C (incomplete_expenses)", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      hasCurrentSavings: false,
      filledMajorAreasCount: 2,
      missingMajorArea: "insurance",
    });
    expect(r.priority).toBe("low_resilience");
  });
});

/* -------------------------------------------------------------------------- */
/*  C. Dépenses incomplètes → priority incomplete_expenses                    */
/* -------------------------------------------------------------------------- */

describe("buildFirstMission — priorité C : dépenses incomplètes", () => {
  it("renvoie incomplete_expenses quand filled < 4", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      filledMajorAreasCount: 3,
      missingMajorArea: "transport",
    });
    expect(r.priority).toBe("incomplete_expenses");
  });

  it("passe palier C à filled = 4 (seuil inclusif)", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      filledMajorAreasCount: 4,
      missingMajorArea: "insurance",
    });
    expect(r.priority).not.toBe("incomplete_expenses");
  });

  it("payload contient missingArea et filledCount", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      filledMajorAreasCount: 2,
      missingMajorArea: "food",
    });
    expect(r.payload.missingArea).toBe("food");
    expect(r.payload.filledCount).toBe(2);
  });

  it("missingArea fallback sur 'income' quand non fourni", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      filledMajorAreasCount: 1,
      missingMajorArea: null,
    });
    expect(r.payload.missingArea).toBe("income");
  });

  it("incomplete_expenses pointe vers /expenses", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      filledMajorAreasCount: 2,
      missingMajorArea: "insurance",
    });
    expect(r.ctaHref).toBe("/expenses");
  });
});

/* -------------------------------------------------------------------------- */
/*  D. Recommandation FHS → priority fhs_recommendation                       */
/* -------------------------------------------------------------------------- */

describe("buildFirstMission — priorité D : recommandation FHS", () => {
  it("renvoie fhs_recommendation quand recommendation est fourni", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      recommendation: baseRecommendation,
    });
    expect(r.priority).toBe("fhs_recommendation");
  });

  it("payload propage targetAxis, recommendationTitle et estimatedGain", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      recommendation: baseRecommendation,
    });
    expect(r.payload.targetAxis).toBe("resilience");
    expect(r.payload.recommendationTitle).toBe("recommend_build_runway");
    expect(r.payload.estimatedGain).toBe(4);
  });

  it("utilise impactWithGain quand estimatedGain > 0", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      recommendation: { ...baseRecommendation, estimatedGain: 5 },
    });
    expect(r.impactKey).toBe("fhs_recommendation.impactWithGain");
  });

  it("utilise impact (sans gain) quand estimatedGain est null ou 0", () => {
    const r0 = buildFirstMission({
      ...happyProfile(),
      recommendation: { ...baseRecommendation, estimatedGain: null },
    });
    expect(r0.impactKey).toBe("fhs_recommendation.impact");
    const r1 = buildFirstMission({
      ...happyProfile(),
      recommendation: { ...baseRecommendation, estimatedGain: 0 },
    });
    expect(r1.impactKey).toBe("fhs_recommendation.impact");
  });

  it("fhs_recommendation pointe vers /coach", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      recommendation: baseRecommendation,
    });
    expect(r.ctaHref).toBe("/coach");
  });

  it("estimatedGain défault 0 dans payload quand recommendation.estimatedGain est null", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      recommendation: { ...baseRecommendation, estimatedGain: null },
    });
    expect(r.payload.estimatedGain).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/*  E. Sinon → none (mission douce, jamais vide)                              */
/* -------------------------------------------------------------------------- */

describe("buildFirstMission — fallback none", () => {
  it("renvoie none quand tout va bien et recommendation = null", () => {
    const r = buildFirstMission(happyProfile());
    expect(r.priority).toBe("none");
  });

  it("none pointe vers /coach (continuation conversation)", () => {
    const r = buildFirstMission(happyProfile());
    expect(r.ctaHref).toBe("/coach");
  });

  it("none expose un payload vide (jamais undefined → pas de crash next-intl)", () => {
    const r = buildFirstMission(happyProfile());
    expect(r.payload).toEqual({});
  });
});

/* -------------------------------------------------------------------------- */
/*  Profils canoniques                                                         */
/* -------------------------------------------------------------------------- */

describe("buildFirstMission — profils canoniques", () => {
  it("utilisateur nouveau (rien rempli) → priorité A (no_goal)", () => {
    const r = buildFirstMission({
      goalsCount: 0,
      runwayMonths: 0,
      hasCurrentSavings: false,
      filledMajorAreasCount: 1,
      missingMajorArea: "housing",
      recommendation: null,
    });
    expect(r.priority).toBe("no_goal");
  });

  it("utilisateur avancé (tout bon, recommandation présente) → fhs_recommendation", () => {
    const r = buildFirstMission({
      goalsCount: 3,
      runwayMonths: 6,
      hasCurrentSavings: true,
      filledMajorAreasCount: 5,
      missingMajorArea: null,
      recommendation: baseRecommendation,
    });
    expect(r.priority).toBe("fhs_recommendation");
  });

  it("utilisateur maximal (tout bon, recommandation null) → none", () => {
    const r = buildFirstMission({
      goalsCount: 3,
      runwayMonths: 12,
      hasCurrentSavings: true,
      filledMajorAreasCount: 5,
      missingMajorArea: null,
      recommendation: null,
    });
    expect(r.priority).toBe("none");
  });
});

/* -------------------------------------------------------------------------- */
/*  Robustesse — pas de crash sur edge cases                                  */
/* -------------------------------------------------------------------------- */

describe("buildFirstMission — robustesse", () => {
  it("ne crash pas si recommendation = null partout dans la cascade", () => {
    expect(() =>
      buildFirstMission({
        goalsCount: 0,
        runwayMonths: 0,
        hasCurrentSavings: false,
        filledMajorAreasCount: 0,
        missingMajorArea: null,
        recommendation: null,
      }),
    ).not.toThrow();
  });

  it("ne crash pas avec runway = Infinity (cas dépenses fixes = 0)", () => {
    const r = buildFirstMission({
      ...happyProfile(),
      hasCurrentSavings: true,
      runwayMonths: Number.POSITIVE_INFINITY,
    });
    expect(r.priority).toBe("none");
  });

  it("renvoie toujours un payload défini (jamais undefined)", () => {
    const cases: BuildFirstMissionInput[] = [
      { ...happyProfile(), goalsCount: 0 },
      { ...happyProfile(), hasCurrentSavings: false },
      { ...happyProfile(), filledMajorAreasCount: 1, missingMajorArea: null },
      { ...happyProfile(), recommendation: baseRecommendation },
      happyProfile(),
    ];
    for (const input of cases) {
      const r = buildFirstMission(input);
      expect(r.payload).toBeDefined();
      expect(typeof r.payload).toBe("object");
    }
  });
});
