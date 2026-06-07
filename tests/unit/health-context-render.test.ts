import { describe, expect, it } from "vitest";
import { renderHealthSection } from "@/lib/ai/health-context";
import { buildFinanceContext } from "@/lib/ai/context";
import { FHS_VERSION } from "@/lib/calculations/health/constants";
import type {
  AxisId,
  AxisResult,
  DrawerData,
  HealthScoreResult,
} from "@/lib/calculations/health/types";
import type { FinanceData } from "@/lib/services/finance";

/* -------------------------------------------------------------------------- */
/*  Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

function axis(
  id: AxisId,
  score: number,
  confidence: AxisResult["confidence"] = "HIGH",
  components: Record<string, number> = {},
): AxisResult {
  return { id, score, confidence, components };
}

function fullAxes(): Record<AxisId, AxisResult> {
  return {
    discipline: axis("discipline", 72),
    resilience: axis("resilience", 56),
    trajectoire: axis("trajectoire", 60),
    couverture: axis("couverture", 88),
    objectifs: axis("objectifs", 70),
    comportement: axis("comportement", 72),
  };
}

function buildDrawer(overrides: Partial<DrawerData> = {}): DrawerData {
  const score: HealthScoreResult = {
    raw: 68,
    smoothed: 68,
    display: 68,
    confidence: "HIGH",
    band: "or",
    axes: fullAxes(),
    previousScore: 65,
    previousBand: "or",
    fhsVersion: FHS_VERSION,
    computedAt: "2026-06-08T12:00:00.000Z",
    ...overrides.score,
  };
  return {
    score,
    delta: overrides.delta !== undefined ? overrides.delta : {
      netDelta: 3,
      contributors: [
        {
          axis: "resilience",
          deltaPoints: 3,
          reasonKey: "resilience_runway_improved",
          payload: { from: 2.7, to: 3.0 },
        },
        {
          axis: "discipline",
          deltaPoints: 2,
          reasonKey: "discipline_budget_streak_improved",
          payload: { successCount: 4, total: 5 },
        },
      ],
      fhsVersion: FHS_VERSION,
      fromWeek: "2026-W22",
      toWeek: "2026-W23",
    },
    momentum: overrides.momentum !== undefined ? overrides.momentum : {
      direction: "UP",
      strength: "MEDIUM",
      delta4Weeks: 5,
      windowSize: 4,
    },
    recommendation: overrides.recommendation !== undefined ? overrides.recommendation : {
      targetAxis: "resilience",
      titleKey: "recommend_build_runway",
      descriptionKey: "recommend_build_runway_desc",
      payload: { addAmount: 3000, gainMonths: 1 },
      estimatedGain: 4,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  renderHealthSection                                                        */
/* -------------------------------------------------------------------------- */

describe("renderHealthSection", () => {
  it("opens with the '# Financial Health Score' header", () => {
    const md = renderHealthSection(buildDrawer());
    expect(md).toMatch(/^# Financial Health Score/);
  });

  it("cites the displayed score exactly (same number as the ring)", () => {
    const md = renderHealthSection(buildDrawer());
    expect(md).toContain("Score affiché : 68/100");
  });

  it("renders the band label in French", () => {
    const md = renderHealthSection(buildDrawer());
    expect(md).toContain("bande : Solide");
  });

  it("renders the confidence label in French", () => {
    const md = renderHealthSection(buildDrawer());
    expect(md).toContain("Confiance : Élevée");
  });

  it("flags INSUFFICIENT_DATA with an explicit caveat", () => {
    const drawer = buildDrawer({
      score: {
        ...buildDrawer().score,
        confidence: "INSUFFICIENT_DATA",
      },
    });
    const md = renderHealthSection(drawer);
    expect(md).toContain("Données insuffisantes");
    expect(md).toMatch(/Lecture provisoire/);
  });

  it("renders the weekly delta line with from → to weeks", () => {
    const md = renderHealthSection(buildDrawer());
    expect(md).toContain("2026-W22 → 2026-W23");
    expect(md).toContain("+3");
  });

  it("falls back to 'Première semaine' when no previous score exists", () => {
    const md = renderHealthSection(
      buildDrawer({
        score: {
          ...buildDrawer().score,
          previousScore: null,
        },
        delta: null,
      }),
    );
    expect(md).toContain("Première semaine");
  });

  it("includes top 3 contributors of the delta", () => {
    const md = renderHealthSection(buildDrawer());
    expect(md).toContain("Résilience");
    expect(md).toContain("fonds d'urgence 2.7 → 3 mois");
    expect(md).toContain("Discipline");
  });

  it("renders the momentum line when momentum is non-null", () => {
    const md = renderHealthSection(buildDrawer());
    expect(md).toContain("Momentum sur 4 semaines");
    expect(md).toContain("progression");
    expect(md).toContain("marquée");
  });

  it("omits the momentum line when momentum is null (insufficient history)", () => {
    const md = renderHealthSection(buildDrawer({ momentum: null }));
    expect(md).not.toContain("Momentum");
  });

  it("picks the weakest axis with ≥ MEDIUM confidence", () => {
    const drawer = buildDrawer();
    // Resilience is 56 — the weakest among the 6 HIGH axes.
    const md = renderHealthSection(drawer);
    expect(md).toContain("Axe le plus faible (exploitable) : Résilience — 56/100");
  });

  it("ignores LOW / UNKNOWN axes when picking the weakest", () => {
    const drawer = buildDrawer();
    // Override resilience to LOW — it should no longer be picked even though
    // its score is lowest.
    drawer.score.axes.resilience = axis("resilience", 30, "LOW");
    drawer.score.axes.trajectoire = axis("trajectoire", 50, "HIGH");
    const md = renderHealthSection(drawer);
    expect(md).toContain("Axe le plus faible (exploitable) : Trajectoire — 50/100");
  });

  it("renders the recommendation with concrete numbers", () => {
    const md = renderHealthSection(buildDrawer());
    expect(md).toContain("Renforcer le fonds d'urgence");
    expect(md).toContain("3000 CHF");
    expect(md).toContain("1 mois de runway");
    expect(md).toContain("+4 points");
  });

  it("omits the recommendation when null", () => {
    const md = renderHealthSection(buildDrawer({ recommendation: null }));
    expect(md).not.toContain("Recommandation");
  });

  it("emits the 6-axis breakdown in canonical order", () => {
    const md = renderHealthSection(buildDrawer());
    const decomp = md.split("Décomposition par axe :")[1];
    expect(decomp).toBeDefined();
    expect(decomp.indexOf("Discipline")).toBeLessThan(decomp.indexOf("Résilience"));
    expect(decomp.indexOf("Résilience")).toBeLessThan(decomp.indexOf("Trajectoire"));
    expect(decomp.indexOf("Trajectoire")).toBeLessThan(decomp.indexOf("Couverture"));
    expect(decomp.indexOf("Couverture")).toBeLessThan(decomp.indexOf("Objectifs"));
    expect(decomp.indexOf("Objectifs")).toBeLessThan(decomp.indexOf("Comportement"));
  });
});

/* -------------------------------------------------------------------------- */
/*  buildFinanceContext integration — section mounted only when provided       */
/* -------------------------------------------------------------------------- */

function buildMinimalFinanceData(): FinanceData {
  return {
    profile: {
      full_name: "Test", email: "t@x.ch", avatar_url: null,
      currency: "CHF", locale: "fr", country: "CH",
      onboarding_completed: true,
    },
    subscription: {
      plan: "premium", status: "active",
      cancel_at_period_end: false, current_period_end: null,
      trial_ends_at: null, trial_used: false,
      price_id: null, has_customer: true,
    },
    financialProfile: null,
    incomes: [],
    expenses: [],
    goals: [],
    expenseBuckets: { fixed: 0, variable: 0, total: 0, transactions: 0 },
    categoryBudgets: [],
    isDemo: false,
  };
}

describe("buildFinanceContext — drawerData section", () => {
  it("does NOT include the Financial Health Score header when drawerData is absent", () => {
    const md = buildFinanceContext(buildMinimalFinanceData());
    expect(md).not.toContain("# Financial Health Score");
  });

  it("does NOT include the section when drawerData is explicitly null", () => {
    const md = buildFinanceContext(buildMinimalFinanceData(), { drawerData: null });
    expect(md).not.toContain("# Financial Health Score");
  });

  it("INCLUDES the section verbatim when drawerData is provided", () => {
    const md = buildFinanceContext(buildMinimalFinanceData(), {
      drawerData: buildDrawer(),
    });
    expect(md).toContain("# Financial Health Score");
    expect(md).toContain("Score affiché : 68/100");
    expect(md).toContain("Décomposition par axe");
  });

  it("citée score in context EXACTLY matches drawerData.score.display", () => {
    const drawer = buildDrawer({
      score: {
        ...buildDrawer().score,
        display: 47,
      },
    });
    const md = buildFinanceContext(buildMinimalFinanceData(), {
      drawerData: drawer,
    });
    expect(md).toContain("Score affiché : 47/100");
    expect(md).not.toContain("Score affiché : 68/100");
  });
});
