import { describe, expect, it } from "vitest";
import { buildRoadmap } from "@/lib/calculations/roadmap-templates";

describe("buildRoadmap — structure", () => {
  it("retourne toujours exactement 4 jalons", () => {
    const r = buildRoadmap({
      priority: "low_resilience",
      mainGoalType: null,
      currentScore: 46,
    });
    expect(r).toHaveLength(4);
    expect(r.map((m) => m.kind)).toEqual([
      "today",
      "fourMonths",
      "twelveMonths",
      "threeYears",
    ]);
  });

  it("AUJOURD'HUI affiche le score si disponible", () => {
    const r = buildRoadmap({
      priority: "low_resilience",
      mainGoalType: null,
      currentScore: 46,
    });
    expect(r[0].titleKey).toBe("today.scoreLabel");
    expect(r[0].payload.score).toBe(46);
  });

  it("AUJOURD'HUI montre 'gettingStarted' si pas de score (INSUFFICIENT_DATA)", () => {
    const r = buildRoadmap({
      priority: "low_resilience",
      mainGoalType: null,
      currentScore: null,
    });
    expect(r[0].titleKey).toBe("today.gettingStartedTitle");
    expect(r[0].subtitleKey).toBe("today.gettingStartedSubtitle");
    expect(r[0].payload).toEqual({});
  });
});

describe("buildRoadmap — adaptation au goalType (étape 3 ans)", () => {
  it("real estate (purchase) → 'Apport constitué'", () => {
    const r = buildRoadmap({
      priority: "no_goal",
      mainGoalType: "purchase",
      currentScore: 50,
    });
    expect(r[3].titleKey).toBe("threeYears.purchase.title");
    expect(r[3].icon).toBe("Home");
  });

  it("travel → 'Voyage financé'", () => {
    const r = buildRoadmap({
      priority: "none",
      mainGoalType: "travel",
      currentScore: 70,
    });
    expect(r[3].titleKey).toBe("threeYears.travel.title");
    expect(r[3].icon).toBe("Plane");
  });

  it("emergency_fund → 'Couverture renforcée'", () => {
    const r = buildRoadmap({
      priority: "low_resilience",
      mainGoalType: "emergency_fund",
      currentScore: 30,
    });
    expect(r[3].titleKey).toBe("threeYears.emergency_fund.title");
    expect(r[3].icon).toBe("Shield");
  });

  it("increase_income → 'Revenus diversifiés'", () => {
    const r = buildRoadmap({
      priority: "no_goal",
      mainGoalType: "increase_income",
      currentScore: 40,
    });
    expect(r[3].titleKey).toBe("threeYears.increase_income.title");
  });

  it("pas de goal → fallback 'Cap long terme'", () => {
    const r = buildRoadmap({
      priority: "low_resilience",
      mainGoalType: null,
      currentScore: 46,
    });
    expect(r[3].titleKey).toBe("threeYears.fallback.title");
    expect(r[3].tone).toBe("neutral");
  });

  it("savings, debt_payoff, other tous mappés (catalogue complet)", () => {
    for (const goal of ["savings", "debt_payoff", "other"] as const) {
      const r = buildRoadmap({
        priority: "none",
        mainGoalType: goal,
        currentScore: 60,
      });
      expect(r[3].titleKey).toMatch(/^threeYears\./);
      expect(r[3].titleKey).not.toBe("threeYears.fallback.title");
    }
  });
});

describe("buildRoadmap — étapes 4 mois et 12 mois pilotées par priority", () => {
  it("low_resilience → 4 mois = Fonds d'urgence complet", () => {
    const r = buildRoadmap({
      priority: "low_resilience",
      mainGoalType: null,
      currentScore: 46,
    });
    expect(r[1].titleKey).toBe("steps.low_resilience.fourMonths.title");
    expect(r[1].icon).toBe("Shield");
  });

  it("no_goal → 4 mois = Premier objectif fixé", () => {
    const r = buildRoadmap({
      priority: "no_goal",
      mainGoalType: null,
      currentScore: 46,
    });
    expect(r[1].titleKey).toBe("steps.no_goal.fourMonths.title");
  });

  it("chaque priorité a sa propre paire 4m/12m", () => {
    const priorities = [
      "no_goal",
      "low_resilience",
      "incomplete_expenses",
      "fhs_recommendation",
      "none",
    ] as const;
    for (const p of priorities) {
      const r = buildRoadmap({
        priority: p,
        mainGoalType: null,
        currentScore: 50,
      });
      expect(r[1].titleKey).toBe(`steps.${p}.fourMonths.title`);
      expect(r[2].titleKey).toBe(`steps.${p}.twelveMonths.title`);
    }
  });
});

describe("buildRoadmap — déterminisme", () => {
  it("mêmes entrées → mêmes sorties", () => {
    const inp = {
      priority: "low_resilience" as const,
      mainGoalType: "purchase" as const,
      currentScore: 46,
    };
    expect(buildRoadmap(inp)).toEqual(buildRoadmap(inp));
  });

  it("payload toujours défini (jamais undefined — anti next-intl strict)", () => {
    const r = buildRoadmap({
      priority: "none",
      mainGoalType: null,
      currentScore: 70,
    });
    for (const m of r) {
      expect(m.payload).toBeDefined();
      expect(typeof m.payload).toBe("object");
    }
  });
});
