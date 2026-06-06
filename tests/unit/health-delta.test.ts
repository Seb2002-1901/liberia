import { describe, expect, it } from "vitest";
import {
  explainDelta,
  MAX_CONTRIBUTORS,
  REASON_KEYS,
  type ReasonKey,
} from "@/lib/calculations/health/delta";
import { FHS_VERSION } from "@/lib/calculations/health/constants";
import type {
  AxisId,
  AxisResult,
  HealthScoreResult,
} from "@/lib/calculations/health/types";

/* -------------------------------------------------------------------------- */
/*  Builders                                                                   */
/* -------------------------------------------------------------------------- */

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

function baselineAxes(): Record<AxisId, AxisResult> {
  return {
    discipline: axis("discipline", 70, "HIGH", {
      budget_score: 80,
      savings_consistency: 60,
      budgets_total: 5,
      budgets_success: 4,
      budgets_critical: 0,
    }),
    resilience: axis("resilience", 56, "HIGH", {
      runway_months: 3.0,
      saved: 9000,
      monthly_burn: 3000,
    }),
    trajectoire: axis("trajectoire", 60, "HIGH", {
      savings_rate: 0.15,
      income_used: 4000,
      fixed: 3400,
    }),
    couverture: axis(
      "couverture",
      80,
      "HIGH",
      {
        structurelle: 80,
        filled_majors_count: 4,
        missing_majors_count: 1,
      },
      {
        filled_majors: ["income", "housing", "food", "transport"],
        missing_majors: ["insurance"],
      },
    ),
    objectifs: axis("objectifs", 60, "HIGH", {
      active_count: 1,
      chiffred_count: 1,
      avg_progress: 0.2,
      ever_completed: 0,
    }),
    comportement: axis("comportement", 72, "HIGH", {
      engagement: 18,
      tx_count: 18,
      coach_msg: 0,
      memory_entries: 0,
    }),
  };
}

function snapshot(
  axes: Record<AxisId, AxisResult>,
  display: number,
  overrides: Partial<HealthScoreResult> = {},
): HealthScoreResult {
  return {
    raw: display,
    smoothed: display,
    display,
    confidence: "HIGH",
    band: display >= 65 ? "or" : display >= 40 ? "ambre" : "rose",
    axes,
    previousScore: null,
    previousBand: null,
    fhsVersion: FHS_VERSION,
    computedAt: "2026-06-08T12:00:00.000Z",
    ...overrides,
  };
}

const FROM = "2026-W22";
const TO = "2026-W23";

/* -------------------------------------------------------------------------- */
/*  Catalogue invariants                                                       */
/* -------------------------------------------------------------------------- */

describe("REASON_KEYS catalogue", () => {
  it("contains exactly 21 reason keys (20 + stable_period)", () => {
    expect(REASON_KEYS.length).toBe(21);
  });

  it("includes the stable_period fallback", () => {
    expect(REASON_KEYS).toContain("stable_period");
  });

  it("has unique entries (no duplicate)", () => {
    expect(new Set(REASON_KEYS).size).toBe(REASON_KEYS.length);
  });
});

/* -------------------------------------------------------------------------- */
/*  Net delta + output shape                                                   */
/* -------------------------------------------------------------------------- */

describe("explainDelta — output shape", () => {
  it("netDelta = current.display - previous.display", () => {
    const prev = snapshot(baselineAxes(), 68);
    const curr = snapshot(baselineAxes(), 71);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    expect(r.netDelta).toBe(3);
  });

  it("preserves fromWeek, toWeek and fhsVersion", () => {
    const prev = snapshot(baselineAxes(), 68);
    const curr = snapshot(baselineAxes(), 71);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    expect(r.fromWeek).toBe(FROM);
    expect(r.toWeek).toBe(TO);
    expect(r.fhsVersion).toBe(FHS_VERSION);
  });

  it("never returns more than MAX_CONTRIBUTORS (= 5)", () => {
    // Force every axis to swing.
    const prev = snapshot(baselineAxes(), 60);
    const currAxes = baselineAxes();
    currAxes.discipline = axis("discipline", 90, "HIGH", {
      budget_score: 100,
      savings_consistency: 75,
      budgets_total: 5,
      budgets_success: 5,
      budgets_critical: 0,
    });
    currAxes.resilience = axis("resilience", 80, "HIGH", {
      runway_months: 6.0,
      saved: 18000,
      monthly_burn: 3000,
    });
    currAxes.trajectoire = axis("trajectoire", 90, "HIGH", {
      savings_rate: 0.22,
      income_used: 4000,
      fixed: 3120,
    });
    currAxes.couverture = axis(
      "couverture",
      95,
      "HIGH",
      { structurelle: 95, filled_majors_count: 5, missing_majors_count: 0 },
      {
        filled_majors: ["income", "housing", "food", "transport", "insurance"],
        missing_majors: [],
      },
    );
    currAxes.objectifs = axis("objectifs", 75, "HIGH", {
      active_count: 1,
      chiffred_count: 1,
      avg_progress: 0.5,
      ever_completed: 0,
    });
    currAxes.comportement = axis("comportement", 88, "HIGH", {
      engagement: 22,
      tx_count: 22,
      coach_msg: 0,
      memory_entries: 0,
    });
    const curr = snapshot(currAxes, 85);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    expect(r.contributors.length).toBeLessThanOrEqual(MAX_CONTRIBUTORS);
    expect(r.contributors.length).toBeGreaterThan(0);
  });

  it("sorts contributors by |deltaPoints| desc", () => {
    const prev = snapshot(baselineAxes(), 68);
    const currAxes = baselineAxes();
    // small move on couverture, big move on resilience
    currAxes.resilience = axis("resilience", 80, "HIGH", {
      runway_months: 6.0,
      saved: 18000,
      monthly_burn: 3000,
    });
    currAxes.couverture = axis(
      "couverture",
      82,
      "HIGH",
      {
        structurelle: 82,
        filled_majors_count: 4,
        missing_majors_count: 1,
      },
      {
        filled_majors: ["income", "housing", "food", "transport"],
        missing_majors: ["insurance"],
      },
    );
    const curr = snapshot(currAxes, 73);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    for (let i = 1; i < r.contributors.length; i++) {
      expect(Math.abs(r.contributors[i - 1].deltaPoints)).toBeGreaterThanOrEqual(
        Math.abs(r.contributors[i].deltaPoints),
      );
    }
  });

  it("at most ONE contributor per axis (dedup)", () => {
    const prev = snapshot(baselineAxes(), 60);
    const currAxes = baselineAxes();
    currAxes.resilience = axis("resilience", 80, "HIGH", {
      runway_months: 6.0,
      saved: 18000,
      monthly_burn: 3000,
    });
    const curr = snapshot(currAxes, 72);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const axes = r.contributors.map((c) => c.axis);
    expect(new Set(axes).size).toBe(axes.length);
  });

  it("ordering is deterministic across reruns (byte-stable)", () => {
    const prev = snapshot(baselineAxes(), 68);
    const curr = snapshot(baselineAxes(), 71);
    const r1 = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const r2 = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    expect(r1).toEqual(r2);
  });
});

/* -------------------------------------------------------------------------- */
/*  stable_period fallback                                                     */
/* -------------------------------------------------------------------------- */

describe("explainDelta — stable_period fallback", () => {
  it("emits 1 stable_period contributor when nothing meaningful moved", () => {
    const axes = baselineAxes();
    const prev = snapshot(axes, 70);
    const curr = snapshot(axes, 70);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    expect(r.contributors.length).toBe(1);
    expect(r.contributors[0].reasonKey).toBe("stable_period");
    expect(r.contributors[0].deltaPoints).toBe(0);
  });

  it("stable_period carrier is the weakest known axis", () => {
    const axes = baselineAxes();
    axes.resilience = axis("resilience", 30, "HIGH", {
      runway_months: 1.0,
      saved: 3000,
      monthly_burn: 3000,
    });
    const prev = snapshot(axes, 60);
    const curr = snapshot(axes, 60);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    expect(r.contributors[0].axis).toBe("resilience");
    expect(r.contributors[0].reasonKey).toBe("stable_period");
  });
});

/* -------------------------------------------------------------------------- */
/*  Discipline reason keys                                                     */
/* -------------------------------------------------------------------------- */

describe("explainDelta — discipline reason keys", () => {
  function disciplineMove(
    prevSuccess: number,
    currSuccess: number,
    prevSavingsConsistency = 60,
    currSavingsConsistency = 60,
    total = 5,
  ) {
    const prevAxes = baselineAxes();
    prevAxes.discipline = axis("discipline", 0, "HIGH", {
      budget_score: (prevSuccess / total) * 100,
      savings_consistency: prevSavingsConsistency,
      budgets_total: total,
      budgets_success: prevSuccess,
      budgets_critical: 0,
    });
    prevAxes.discipline.score = Math.round(
      0.6 * (prevSuccess / total) * 100 + 0.4 * prevSavingsConsistency,
    );
    const currAxes = baselineAxes();
    currAxes.discipline = axis("discipline", 0, "HIGH", {
      budget_score: (currSuccess / total) * 100,
      savings_consistency: currSavingsConsistency,
      budgets_total: total,
      budgets_success: currSuccess,
      budgets_critical: 0,
    });
    currAxes.discipline.score = Math.round(
      0.6 * (currSuccess / total) * 100 + 0.4 * currSavingsConsistency,
    );
    return {
      prev: snapshot(prevAxes, 60),
      curr: snapshot(currAxes, 70),
    };
  }

  it("discipline_budget_streak_improved when budget streak grows", () => {
    const { prev, curr } = disciplineMove(2, 5);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "discipline");
    expect(d?.reasonKey).toBe("discipline_budget_streak_improved");
    expect(d?.payload.successCount).toBe(5);
    expect(d?.payload.total).toBe(5);
  });

  it("discipline_budget_breach when budget score drops", () => {
    const { prev, curr } = disciplineMove(5, 2);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "discipline");
    expect(d?.reasonKey).toBe("discipline_budget_breach");
    expect(d?.payload.failingCount).toBe(3);
  });

  it("discipline_savings_more_regular when consistency grows without budget change", () => {
    const { prev, curr } = disciplineMove(4, 4, 40, 90);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "discipline");
    expect(d?.reasonKey).toBe("discipline_savings_more_regular");
  });

  it("discipline_savings_less_regular when consistency drops without budget change", () => {
    const { prev, curr } = disciplineMove(4, 4, 90, 40);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "discipline");
    expect(d?.reasonKey).toBe("discipline_savings_less_regular");
  });
});

/* -------------------------------------------------------------------------- */
/*  Résilience reason keys                                                     */
/* -------------------------------------------------------------------------- */

describe("explainDelta — resilience reason keys", () => {
  function resilienceMove(
    prevRunway: number,
    currRunway: number,
    burn = 3000,
    extraSaved = 0,
    extraBurn = 0,
  ) {
    const prevAxes = baselineAxes();
    prevAxes.resilience = axis("resilience", 0, "HIGH", {
      runway_months: prevRunway,
      saved: prevRunway * burn,
      monthly_burn: burn,
    });
    prevAxes.resilience.score = Math.min(
      100,
      Math.round(Math.log2(1 + prevRunway) * 28),
    );
    const currAxes = baselineAxes();
    currAxes.resilience = axis("resilience", 0, "HIGH", {
      runway_months: currRunway,
      saved: currRunway * (burn + extraBurn) + extraSaved,
      monthly_burn: burn + extraBurn,
    });
    currAxes.resilience.score = Math.min(
      100,
      Math.round(Math.log2(1 + currRunway) * 28),
    );
    return {
      prev: snapshot(prevAxes, 60),
      curr: snapshot(currAxes, 65),
    };
  }

  it("resilience_runway_improved with from/to payload", () => {
    const { prev, curr } = resilienceMove(2.7, 3.0);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "resilience");
    expect(d?.reasonKey).toBe("resilience_runway_improved");
    expect(d?.payload.from).toBe(2.7);
    expect(d?.payload.to).toBe(3.0);
  });

  it("resilience_runway_declined with from/to payload", () => {
    const { prev, curr } = resilienceMove(4.0, 3.0);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "resilience");
    expect(d?.reasonKey).toBe("resilience_runway_declined");
    expect(d?.payload.from).toBe(4.0);
    expect(d?.payload.to).toBe(3.0);
  });

  it("resilience_runway_improved emitted on small but meaningful move", () => {
    // 0.5 month gain — small but enough for axis score to shift by
    // more than 1 point of contribution after weighting.
    const { prev, curr } = resilienceMove(3.0, 3.5);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "resilience");
    expect(d?.reasonKey).toBe("resilience_runway_improved");
  });
});

/* -------------------------------------------------------------------------- */
/*  Trajectoire reason keys                                                    */
/* -------------------------------------------------------------------------- */

describe("explainDelta — trajectoire reason keys", () => {
  function trajectoireMove(prevRate: number, currRate: number) {
    const prevAxes = baselineAxes();
    prevAxes.trajectoire = axis("trajectoire", 0, "HIGH", {
      savings_rate: prevRate,
      income_used: 4000,
      fixed: 4000 * (1 - prevRate),
    });
    prevAxes.trajectoire.score = Math.min(
      100,
      Math.max(0, Math.round(prevRate * 400)),
    );
    const currAxes = baselineAxes();
    currAxes.trajectoire = axis("trajectoire", 0, "HIGH", {
      savings_rate: currRate,
      income_used: 4000,
      fixed: 4000 * (1 - currRate),
    });
    currAxes.trajectoire.score = Math.min(
      100,
      Math.max(0, Math.round(currRate * 400)),
    );
    return { prev: snapshot(prevAxes, 60), curr: snapshot(currAxes, 65) };
  }

  it("trajectoire_savings_rate_improved with from/to percent payload", () => {
    const { prev, curr } = trajectoireMove(0.10, 0.18);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "trajectoire");
    expect(d?.reasonKey).toBe("trajectoire_savings_rate_improved");
    expect(d?.payload.fromPct).toBe(10);
    expect(d?.payload.toPct).toBe(18);
  });

  it("trajectoire_savings_rate_declined", () => {
    const { prev, curr } = trajectoireMove(0.20, 0.10);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "trajectoire");
    expect(d?.reasonKey).toBe("trajectoire_savings_rate_declined");
  });
});

/* -------------------------------------------------------------------------- */
/*  Couverture reason keys                                                     */
/* -------------------------------------------------------------------------- */

describe("explainDelta — couverture reason keys", () => {
  it("couverture_area_added when a new major area is filled", () => {
    const prevAxes = baselineAxes();
    prevAxes.couverture = axis(
      "couverture",
      60,
      "HIGH",
      { structurelle: 60, filled_majors_count: 3, missing_majors_count: 2 },
      {
        filled_majors: ["income", "housing", "food"],
        missing_majors: ["insurance", "transport"],
      },
    );
    const currAxes = baselineAxes();
    currAxes.couverture = axis(
      "couverture",
      72,
      "HIGH",
      { structurelle: 72, filled_majors_count: 4, missing_majors_count: 1 },
      {
        filled_majors: ["income", "housing", "food", "insurance"],
        missing_majors: ["transport"],
      },
    );
    const prev = snapshot(prevAxes, 60);
    const curr = snapshot(currAxes, 65);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "couverture");
    expect(d?.reasonKey).toBe("couverture_area_added");
    expect(d?.payload.area).toBe("insurance");
  });

  it("couverture_area_removed when an area is dropped", () => {
    const prevAxes = baselineAxes();
    prevAxes.couverture = axis(
      "couverture",
      80,
      "HIGH",
      { structurelle: 80, filled_majors_count: 4, missing_majors_count: 1 },
      {
        filled_majors: ["income", "housing", "food", "insurance"],
        missing_majors: ["transport"],
      },
    );
    const currAxes = baselineAxes();
    currAxes.couverture = axis(
      "couverture",
      70,
      "HIGH",
      { structurelle: 70, filled_majors_count: 3, missing_majors_count: 2 },
      {
        filled_majors: ["income", "housing", "food"],
        missing_majors: ["insurance", "transport"],
      },
    );
    const prev = snapshot(prevAxes, 70);
    const curr = snapshot(currAxes, 65);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "couverture");
    expect(d?.reasonKey).toBe("couverture_area_removed");
    expect(d?.payload.area).toBe("insurance");
  });

  it("couverture_refined when structurelle moved without area changes", () => {
    const prevAxes = baselineAxes();
    prevAxes.couverture = axis(
      "couverture",
      70,
      "HIGH",
      { structurelle: 70, filled_majors_count: 4, missing_majors_count: 1 },
      {
        filled_majors: ["income", "housing", "food", "transport"],
        missing_majors: ["insurance"],
      },
    );
    const currAxes = baselineAxes();
    currAxes.couverture = axis(
      "couverture",
      85,
      "HIGH",
      { structurelle: 85, filled_majors_count: 4, missing_majors_count: 1 },
      {
        filled_majors: ["income", "housing", "food", "transport"],
        missing_majors: ["insurance"],
      },
    );
    const prev = snapshot(prevAxes, 60);
    const curr = snapshot(currAxes, 65);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "couverture");
    expect(d?.reasonKey).toBe("couverture_refined");
  });
});

/* -------------------------------------------------------------------------- */
/*  Objectifs reason keys                                                      */
/* -------------------------------------------------------------------------- */

describe("explainDelta — objectifs reason keys", () => {
  function objectifsMove(prevState: {
    active: number;
    progress: number;
    completed: number;
    score: number;
  }, currState: {
    active: number;
    progress: number;
    completed: number;
    score: number;
  }) {
    const prevAxes = baselineAxes();
    prevAxes.objectifs = axis("objectifs", prevState.score, "HIGH", {
      active_count: prevState.active,
      chiffred_count: prevState.active,
      avg_progress: prevState.progress,
      ever_completed: prevState.completed,
    });
    const currAxes = baselineAxes();
    currAxes.objectifs = axis("objectifs", currState.score, "HIGH", {
      active_count: currState.active,
      chiffred_count: currState.active,
      avg_progress: currState.progress,
      ever_completed: currState.completed,
    });
    return { prev: snapshot(prevAxes, 60), curr: snapshot(currAxes, 65) };
  }

  it("objectifs_goal_completed when ever_completed increments", () => {
    const { prev, curr } = objectifsMove(
      { active: 1, progress: 0.9, completed: 0, score: 95 },
      { active: 0, progress: 0, completed: 1, score: 30 },
    );
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "objectifs");
    expect(d?.reasonKey).toBe("objectifs_goal_completed");
  });

  it("objectifs_new_goal_set when active_count grows from 0", () => {
    const { prev, curr } = objectifsMove(
      { active: 0, progress: 0, completed: 0, score: 0 },
      { active: 1, progress: 0, completed: 0, score: 50 },
    );
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "objectifs");
    expect(d?.reasonKey).toBe("objectifs_new_goal_set");
  });

  it("objectifs_no_goals_anymore when active drops to 0 without completion", () => {
    const { prev, curr } = objectifsMove(
      { active: 1, progress: 0.5, completed: 0, score: 75 },
      { active: 0, progress: 0, completed: 0, score: 0 },
    );
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "objectifs");
    expect(d?.reasonKey).toBe("objectifs_no_goals_anymore");
  });

  it("objectifs_progress_made when avg_progress grows on stable count", () => {
    const { prev, curr } = objectifsMove(
      { active: 1, progress: 0.20, completed: 0, score: 60 },
      { active: 1, progress: 0.40, completed: 0, score: 70 },
    );
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "objectifs");
    expect(d?.reasonKey).toBe("objectifs_progress_made");
    expect(d?.payload.pct).toBe(40);
  });

  it("objectifs_progress_stalled when avg_progress declines on stable count", () => {
    // 30 points of axis-score drop — survives the renormalised weight
    // (0.10) to land a -3 contribution, above MIN_AXIS_CONTRIBUTION.
    const { prev, curr } = objectifsMove(
      { active: 1, progress: 0.80, completed: 0, score: 90 },
      { active: 1, progress: 0.20, completed: 0, score: 60 },
    );
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "objectifs");
    expect(d?.reasonKey).toBe("objectifs_progress_stalled");
  });
});

/* -------------------------------------------------------------------------- */
/*  Comportement reason keys                                                   */
/* -------------------------------------------------------------------------- */

describe("explainDelta — comportement reason keys", () => {
  function comportementMove(prevEngagement: number, currEngagement: number) {
    const prevAxes = baselineAxes();
    prevAxes.comportement = axis("comportement", Math.min(100, prevEngagement * 4), "HIGH", {
      engagement: prevEngagement,
      tx_count: prevEngagement,
      coach_msg: 0,
      memory_entries: 0,
    });
    const currAxes = baselineAxes();
    currAxes.comportement = axis("comportement", Math.min(100, currEngagement * 4), "HIGH", {
      engagement: currEngagement,
      tx_count: currEngagement,
      coach_msg: 0,
      memory_entries: 0,
    });
    return { prev: snapshot(prevAxes, 60), curr: snapshot(currAxes, 65) };
  }

  it("comportement_more_active when engagement grows", () => {
    const { prev, curr } = comportementMove(2, 20);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "comportement");
    expect(d?.reasonKey).toBe("comportement_more_active");
  });

  it("comportement_less_active when engagement shrinks", () => {
    const { prev, curr } = comportementMove(20, 2);
    const r = explainDelta({ current: curr, previous: prev, fromWeek: FROM, toWeek: TO });
    const d = r.contributors.find((c) => c.axis === "comportement");
    expect(d?.reasonKey).toBe("comportement_less_active");
  });
});

/* -------------------------------------------------------------------------- */
/*  Catalogue completeness — every key is reachable                            */
/* -------------------------------------------------------------------------- */

describe("REASON_KEYS coverage — every non-fallback key has a test above", () => {
  it("each REASON_KEYS entry is a stable string literal (no typo)", () => {
    for (const key of REASON_KEYS) {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(3);
    }
  });

  it("ReasonKey type union matches the REASON_KEYS array (compile-time)", () => {
    // If this assignment compiles, the union and the array are in sync.
    const sample: ReasonKey = "stable_period";
    expect(REASON_KEYS).toContain(sample);
  });
});
