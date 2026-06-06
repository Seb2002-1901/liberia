import { describe, expect, it } from "vitest";
import { buildHealthRecommendation } from "@/lib/calculations/health/recommendation";
import { FHS_VERSION } from "@/lib/calculations/health/constants";
import type {
  AxisId,
  AxisResult,
  HealthScoreResult,
} from "@/lib/calculations/health/types";

function axis(
  id: AxisId,
  score: number,
  confidence: AxisResult["confidence"] = "HIGH",
  components: Record<string, number> = {},
  details?: Record<string, string | string[]>,
): AxisResult {
  return {
    id,
    score,
    confidence,
    components,
    ...(details ? { details } : {}),
  };
}

function score(
  axes: Record<AxisId, AxisResult>,
  display = 70,
  confidence: HealthScoreResult["confidence"] = "HIGH",
): HealthScoreResult {
  return {
    raw: display,
    smoothed: display,
    display,
    confidence,
    band: display >= 65 ? "or" : display >= 40 ? "ambre" : "rose",
    axes,
    previousScore: null,
    previousBand: null,
    fhsVersion: FHS_VERSION,
    computedAt: "2026-06-08T12:00:00.000Z",
  };
}

function balancedAxes(): Record<AxisId, AxisResult> {
  return {
    discipline: axis("discipline", 80, "HIGH", {
      budget_score: 80,
      savings_consistency: 80,
      budgets_total: 5,
      budgets_success: 4,
      budgets_critical: 0,
    }),
    resilience: axis("resilience", 80, "HIGH", {
      runway_months: 6.0,
      saved: 18000,
      monthly_burn: 3000,
    }),
    trajectoire: axis("trajectoire", 80, "HIGH", {
      savings_rate: 0.20,
      income_used: 4000,
      fixed: 3200,
    }),
    couverture: axis(
      "couverture",
      80,
      "HIGH",
      { structurelle: 80, filled_majors_count: 4, missing_majors_count: 1 },
      {
        filled_majors: ["income", "housing", "food", "transport"],
        missing_majors: ["insurance"],
      },
    ),
    objectifs: axis("objectifs", 80, "HIGH", {
      active_count: 1,
      chiffred_count: 1,
      avg_progress: 0.60,
      ever_completed: 0,
    }),
    comportement: axis("comportement", 80, "HIGH", {
      engagement: 20,
      tx_count: 20,
      coach_msg: 0,
      memory_entries: 0,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Short-circuits                                                             */
/* -------------------------------------------------------------------------- */

describe("buildHealthRecommendation — short-circuits", () => {
  it("returns null on INSUFFICIENT_DATA score", () => {
    const r = buildHealthRecommendation({
      score: score(balancedAxes(), 50, "INSUFFICIENT_DATA"),
    });
    expect(r).toBeNull();
  });

  it("returns null when every recommendable axis is LOW or UNKNOWN", () => {
    const axes = balancedAxes();
    for (const id of ["resilience", "trajectoire", "discipline", "couverture", "objectifs"] as AxisId[]) {
      axes[id] = { ...axes[id], confidence: "LOW" };
    }
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/*  Axis selection                                                             */
/* -------------------------------------------------------------------------- */

describe("buildHealthRecommendation — axis selection", () => {
  it("picks the weakest recommendable axis with confidence ≥ MEDIUM", () => {
    const axes = balancedAxes();
    // Force resilience to be the weakest.
    axes.resilience = axis("resilience", 30, "HIGH", {
      runway_months: 1.0,
      saved: 3000,
      monthly_burn: 3000,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.targetAxis).toBe("resilience");
  });

  it("never targets comportement (excluded)", () => {
    const axes = balancedAxes();
    // Comportement is weakest by far ; the engine must look further down.
    axes.comportement = axis("comportement", 5, "HIGH", { engagement: 1 });
    axes.resilience = axis("resilience", 40, "HIGH", {
      runway_months: 1.5,
      saved: 4500,
      monthly_burn: 3000,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.targetAxis).not.toBe("comportement");
    expect(r?.targetAxis).toBe("resilience"); // second-weakest among recommendable
  });

  it("skips axes with LOW confidence (we don't recommend what we can't see)", () => {
    const axes = balancedAxes();
    axes.resilience = { ...axes.resilience, score: 20, confidence: "LOW" };
    axes.trajectoire = { ...axes.trajectoire, score: 45, confidence: "HIGH" };
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.targetAxis).toBe("trajectoire");
  });

  it("ties broken by RECOMMENDABLE_AXES order (resilience > trajectoire > discipline)", () => {
    const axes = balancedAxes();
    axes.resilience = { ...axes.resilience, score: 40 };
    axes.trajectoire = { ...axes.trajectoire, score: 40 };
    axes.discipline = { ...axes.discipline, score: 40 };
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.targetAxis).toBe("resilience");
  });
});

/* -------------------------------------------------------------------------- */
/*  Simulated gains                                                            */
/* -------------------------------------------------------------------------- */

describe("buildHealthRecommendation — Résilience simulation", () => {
  it("recommends recommend_build_runway with concrete addAmount", () => {
    const axes = balancedAxes();
    axes.resilience = axis("resilience", 30, "HIGH", {
      runway_months: 1.0,
      saved: 3000,
      monthly_burn: 3000,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.titleKey).toBe("recommend_build_runway");
    // +1 month at 3000 CHF/month burn = +3000 CHF
    expect(r?.payload.addAmount).toBe(3000);
    expect(r?.payload.gainMonths).toBe(1);
    expect(r?.estimatedGain).not.toBeNull();
    expect(r?.estimatedGain).toBeGreaterThan(0);
  });

  it("estimatedGain is small but positive (axis weight × axis delta)", () => {
    const axes = balancedAxes();
    axes.resilience = axis("resilience", 28, "HIGH", {
      runway_months: 1.0,
      saved: 3000,
      monthly_burn: 3000,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    // +1 month runway : log2(3) × 28 ≈ 44 → axis delta ≈ 16
    // global gain ≈ 16 × 0.25 = 4
    expect(r?.estimatedGain).toBeGreaterThanOrEqual(3);
    expect(r?.estimatedGain).toBeLessThanOrEqual(5);
  });
});

describe("buildHealthRecommendation — Trajectoire simulation", () => {
  it("recommends recommend_increase_savings_rate when trajectoire is weakest", () => {
    const axes = balancedAxes();
    axes.trajectoire = axis("trajectoire", 20, "HIGH", {
      savings_rate: 0.05,
      income_used: 4000,
      fixed: 3800,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.targetAxis).toBe("trajectoire");
    expect(r?.titleKey).toBe("recommend_increase_savings_rate");
    expect(r?.payload.byPct).toBe(5);
    expect(r?.payload.fromPct).toBe(5);
    expect(r?.payload.toPct).toBe(10);
  });

  it("estimatedGain reflects +5 pts × 400 × axis weight (0.20)", () => {
    const axes = balancedAxes();
    axes.trajectoire = axis("trajectoire", 20, "HIGH", {
      savings_rate: 0.05,
      income_used: 4000,
      fixed: 3800,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    // axisDelta = 20 → global = 20 × 0.20 = 4
    expect(r?.estimatedGain).toBeGreaterThanOrEqual(3);
    expect(r?.estimatedGain).toBeLessThanOrEqual(5);
  });
});

describe("buildHealthRecommendation — Discipline simulation", () => {
  it("recommends recommend_close_one_budget when budgets exist", () => {
    const axes = balancedAxes();
    axes.discipline = axis("discipline", 40, "HIGH", {
      budget_score: 40,
      savings_consistency: 40,
      budgets_total: 5,
      budgets_success: 2,
      budgets_critical: 0,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.targetAxis).toBe("discipline");
    expect(r?.titleKey).toBe("recommend_close_one_budget");
    expect(r?.payload.successCount).toBe(2);
    expect(r?.payload.newSuccessCount).toBe(3);
    expect(r?.payload.total).toBe(5);
  });

  it("recommends recommend_set_first_budgets when no budgets exist", () => {
    const axes = balancedAxes();
    axes.discipline = axis("discipline", 28, "LOW", {
      budget_score: 0,
      savings_consistency: 70,
      budgets_total: 0,
      budgets_success: 0,
      budgets_critical: 0,
    });
    // discipline LOW won't qualify ; force MEDIUM to test the no-budgets branch
    axes.discipline = { ...axes.discipline, confidence: "MEDIUM" };
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.targetAxis).toBe("discipline");
    expect(r?.titleKey).toBe("recommend_set_first_budgets");
  });
});

describe("buildHealthRecommendation — Couverture simulation", () => {
  it("recommends recommend_complete_profile with the next missing area", () => {
    const axes = balancedAxes();
    axes.couverture = axis(
      "couverture",
      40,
      "HIGH",
      { structurelle: 40, filled_majors_count: 2, missing_majors_count: 3 },
      {
        filled_majors: ["income", "housing"],
        missing_majors: ["insurance", "food", "transport"],
      },
    );
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.targetAxis).toBe("couverture");
    expect(r?.titleKey).toBe("recommend_complete_profile");
    expect(r?.payload.area).toBe("insurance");
  });
});

describe("buildHealthRecommendation — Objectifs simulation", () => {
  it("recommends recommend_set_first_goal when active_count is 0", () => {
    const axes = balancedAxes();
    axes.objectifs = axis("objectifs", 0, "MEDIUM", {
      active_count: 0,
      chiffred_count: 0,
      avg_progress: 0,
      ever_completed: 0,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.targetAxis).toBe("objectifs");
    expect(r?.titleKey).toBe("recommend_set_first_goal");
    expect(r?.estimatedGain).toBeGreaterThan(0);
  });

  it("recommends recommend_advance_goal when goal exists with low progress", () => {
    const axes = balancedAxes();
    axes.objectifs = axis("objectifs", 55, "HIGH", {
      active_count: 1,
      chiffred_count: 1,
      avg_progress: 0.10,
      ever_completed: 0,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.targetAxis).toBe("objectifs");
    expect(r?.titleKey).toBe("recommend_advance_goal");
    expect(r?.payload.fromPct).toBe(10);
    expect(r?.payload.toPct).toBe(35);
  });
});

/* -------------------------------------------------------------------------- */
/*  Output contract                                                            */
/* -------------------------------------------------------------------------- */

describe("buildHealthRecommendation — output contract", () => {
  it("always returns a payload object (never null payload)", () => {
    const axes = balancedAxes();
    axes.resilience = axis("resilience", 30, "HIGH", {
      runway_months: 1.0,
      saved: 3000,
      monthly_burn: 3000,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(r?.payload).toBeTypeOf("object");
    expect(r?.payload).not.toBeNull();
  });

  it("titleKey and descriptionKey are stable string literals", () => {
    const axes = balancedAxes();
    axes.resilience = axis("resilience", 30, "HIGH", {
      runway_months: 1.0,
      saved: 3000,
      monthly_burn: 3000,
    });
    const r = buildHealthRecommendation({ score: score(axes) });
    expect(typeof r?.titleKey).toBe("string");
    expect(typeof r?.descriptionKey).toBe("string");
    expect(r?.titleKey).toMatch(/^recommend_/);
    expect(r?.descriptionKey).toMatch(/^recommend_/);
  });
});
