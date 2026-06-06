import {
  AXIS_WEIGHTS,
  RECOMMENDATION_ACTIONS,
} from "./constants";
import { clamp, round, roundInt } from "./utils";
import type {
  AxisId,
  AxisResult,
  HealthRecommendation,
  HealthScoreResult,
} from "./types";

/**
 * Phase 3.2 — Recommendation Engine.
 *
 * Single source of truth for "what should the user do next ?". The
 * drawer's "Pour aller plus haut" block reads this, the coach can
 * cite it, future notifications and Monthly Review use the same
 * output — no parallel inference, no duplicated reasoning.
 *
 * Strategy :
 *   1. Pick the WEAKEST axis whose confidence is ≥ MEDIUM
 *      (we don't recommend acting on what we can't see).
 *   2. Simulate a CANONICAL action for that axis (e.g. +1 month
 *      runway, +5 pts savings rate, +1 budget respected).
 *   3. Recompute the axis score under that simulation, then project
 *      onto the global raw score using the renormalised weight.
 *   4. estimatedGain = round(axisDelta × renorm_weight).
 *
 * Rules :
 *   - INSUFFICIENT_DATA score → return null. Recommending an action
 *     on a profile we cannot read would be irresponsible.
 *   - Comportement axis EXCLUDED. Engagement is the easiest to game
 *     and the gain is capped at 5 — recommending it would invite
 *     vanity activity over real-world behaviour change.
 *   - When no recommendable axis qualifies (every axis is LOW or
 *     UNKNOWN), return null — the drawer falls back to a generic
 *     "complete your profile" hint at the UI layer.
 */

/* -------------------------------------------------------------------------- */
/*  Configuration                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Axes the engine will recommend on, in CANONICAL preference order.
 * Used as the tiebreaker when two axes share the same score.
 *
 * Ordering rationale : Résilience first because it is the most
 * actionable + most impactful change a user can make. Trajectoire
 * second (savings rate). Discipline third (budget respect — depends
 * on existing budgets). Couverture fourth (fill-in). Objectifs last
 * because setting an arbitrary goal is the least concrete action.
 */
const RECOMMENDABLE_AXES: readonly AxisId[] = [
  "resilience",
  "trajectoire",
  "discipline",
  "couverture",
  "objectifs",
];

/** Approximate score points one MAJOR area covers in completeness. */
const COUVERTURE_AREA_POINTS = 10;

/* -------------------------------------------------------------------------- */
/*  Public entry point                                                         */
/* -------------------------------------------------------------------------- */

export interface BuildHealthRecommendationInput {
  score: HealthScoreResult;
}

export function buildHealthRecommendation(
  input: BuildHealthRecommendationInput,
): HealthRecommendation | null {
  const { score } = input;

  // Don't recommend on a profile we won't interpret.
  if (score.confidence === "INSUFFICIENT_DATA") return null;

  // Pick the weakest axis among recommendable ones with confidence
  // ≥ MEDIUM. Score ties are broken by RECOMMENDABLE_AXES order.
  const candidates = RECOMMENDABLE_AXES
    .map((id) => score.axes[id])
    .filter((a): a is AxisResult =>
      Boolean(a) && (a.confidence === "HIGH" || a.confidence === "MEDIUM"),
    );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return (
      RECOMMENDABLE_AXES.indexOf(a.id) - RECOMMENDABLE_AXES.indexOf(b.id)
    );
  });

  const weakest = candidates[0];
  return simulate(weakest, score);
}

/* -------------------------------------------------------------------------- */
/*  Per-axis simulators                                                        */
/* -------------------------------------------------------------------------- */

function simulate(
  weakest: AxisResult,
  score: HealthScoreResult,
): HealthRecommendation {
  switch (weakest.id) {
    case "resilience":
      return simulateResilience(weakest, score);
    case "trajectoire":
      return simulateTrajectoire(weakest, score);
    case "discipline":
      return simulateDiscipline(weakest, score);
    case "couverture":
      return simulateCouverture(weakest, score);
    case "objectifs":
      return simulateObjectifs(weakest, score);
    default:
      // Unreachable — comportement is filtered out by RECOMMENDABLE_AXES.
      // Type system requires a return.
      return {
        targetAxis: weakest.id,
        titleKey: "recommend_generic",
        descriptionKey: "recommend_generic_desc",
        payload: {},
        estimatedGain: null,
      };
  }
}

function simulateResilience(
  axis: AxisResult,
  score: HealthScoreResult,
): HealthRecommendation {
  const monthlyBurn = num(axis.components.monthly_burn) ?? 0;
  const currentRunway = num(axis.components.runway_months) ?? 0;
  const gainMonths = RECOMMENDATION_ACTIONS.RESILIENCE_TARGET_RUNWAY_GAIN_MONTHS;
  const addAmount = roundInt(monthlyBurn * gainMonths);
  const newRunway = currentRunway + gainMonths;
  const newAxisScore = clamp(
    roundInt(Math.log2(1 + newRunway) * 28),
    0,
    100,
  );
  const estimatedGain = projectAxisGainToGlobal(
    newAxisScore - axis.score,
    "resilience",
    score,
  );
  return {
    targetAxis: "resilience",
    titleKey: "recommend_build_runway",
    descriptionKey: "recommend_build_runway_desc",
    payload: { addAmount, gainMonths },
    estimatedGain,
  };
}

function simulateTrajectoire(
  axis: AxisResult,
  score: HealthScoreResult,
): HealthRecommendation {
  const currentRate = num(axis.components.savings_rate) ?? 0;
  const gainRate = RECOMMENDATION_ACTIONS.TRAJECTOIRE_TARGET_RATE_GAIN;
  const newRate = currentRate + gainRate;
  const newAxisScore = clamp(roundInt(newRate * 400), 0, 100);
  const estimatedGain = projectAxisGainToGlobal(
    newAxisScore - axis.score,
    "trajectoire",
    score,
  );
  return {
    targetAxis: "trajectoire",
    titleKey: "recommend_increase_savings_rate",
    descriptionKey: "recommend_increase_savings_rate_desc",
    payload: {
      byPct: Math.round(gainRate * 100),
      fromPct: Math.round(currentRate * 100),
      toPct: Math.round(newRate * 100),
    },
    estimatedGain,
  };
}

function simulateDiscipline(
  axis: AxisResult,
  score: HealthScoreResult,
): HealthRecommendation {
  const total = num(axis.components.budgets_total) ?? 0;
  const success = num(axis.components.budgets_success) ?? 0;
  const savingsConsistency = num(axis.components.savings_consistency) ?? 70;

  // If no budgets exist, "respect one more budget" is not actionable
  // — pivot to a different recommendation : define a first budget.
  if (total === 0) {
    // Use a generic "set up budgets" — gain estimated as the lift
    // achievable when the user reaches success rate 80 % on 3 budgets
    // (canonical first-step target).
    const newBudgetScore = roundInt((2 / 3) * 100); // 2/3 SUCCESS ≈ 67
    const newAxisScore = clamp(
      roundInt(0.6 * newBudgetScore + 0.4 * savingsConsistency),
      0,
      100,
    );
    const estimatedGain = projectAxisGainToGlobal(
      newAxisScore - axis.score,
      "discipline",
      score,
    );
    return {
      targetAxis: "discipline",
      titleKey: "recommend_set_first_budgets",
      descriptionKey: "recommend_set_first_budgets_desc",
      payload: {},
      estimatedGain,
    };
  }

  // Budgets exist : recommend respecting ONE more this month.
  const newSuccess = Math.min(total, success + 1);
  const newBudgetScore = clamp(
    roundInt((newSuccess / total) * 100),
    0,
    100,
  );
  const newAxisScore = clamp(
    roundInt(0.6 * newBudgetScore + 0.4 * savingsConsistency),
    0,
    100,
  );
  const estimatedGain = projectAxisGainToGlobal(
    newAxisScore - axis.score,
    "discipline",
    score,
  );
  return {
    targetAxis: "discipline",
    titleKey: "recommend_close_one_budget",
    descriptionKey: "recommend_close_one_budget_desc",
    payload: { successCount: success, total, newSuccessCount: newSuccess },
    estimatedGain,
  };
}

function simulateCouverture(
  axis: AxisResult,
  score: HealthScoreResult,
): HealthRecommendation {
  const missingMajors = strArr(axis.details?.missing_majors);
  const nextArea = missingMajors[0] ?? "income";
  const newAxisScore = clamp(axis.score + COUVERTURE_AREA_POINTS, 0, 100);
  const estimatedGain = projectAxisGainToGlobal(
    newAxisScore - axis.score,
    "couverture",
    score,
  );
  return {
    targetAxis: "couverture",
    titleKey: "recommend_complete_profile",
    descriptionKey: "recommend_complete_profile_desc",
    payload: { area: nextArea },
    estimatedGain,
  };
}

function simulateObjectifs(
  axis: AxisResult,
  score: HealthScoreResult,
): HealthRecommendation {
  const activeCount = num(axis.components.active_count) ?? 0;
  const avgProgress = num(axis.components.avg_progress) ?? 0;

  if (activeCount === 0) {
    // No goal yet — setting a first one jumps the axis from 0 / 30 to 50.
    const newAxisScore = 50;
    const estimatedGain = projectAxisGainToGlobal(
      newAxisScore - axis.score,
      "objectifs",
      score,
    );
    return {
      targetAxis: "objectifs",
      titleKey: "recommend_set_first_goal",
      descriptionKey: "recommend_set_first_goal_desc",
      payload: {},
      estimatedGain,
    };
  }

  // Goal exists — recommend advancing the average progress by 25 %.
  const newAvg = clamp(avgProgress + 0.25, 0, 1);
  const newAxisScore = clamp(roundInt(50 + 50 * newAvg), 0, 100);
  const estimatedGain = projectAxisGainToGlobal(
    newAxisScore - axis.score,
    "objectifs",
    score,
  );
  return {
    targetAxis: "objectifs",
    titleKey: "recommend_advance_goal",
    descriptionKey: "recommend_advance_goal_desc",
    payload: {
      byPct: 25,
      fromPct: Math.round(avgProgress * 100),
      toPct: Math.round(newAvg * 100),
    },
    estimatedGain,
  };
}

/* -------------------------------------------------------------------------- */
/*  Projection helper                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Project an axis-level score delta onto the global score using the
 * renormalised weight of that axis at the current snapshot. Mirrors
 * what the composition layer would do if the new axis score were
 * passed back in.
 *
 * Returns null when the projection cannot be computed (degenerate
 * profile with no known axis — should never happen here because the
 * INSUFFICIENT_DATA short-circuit caught it earlier, but defensive
 * code stays defensive).
 */
function projectAxisGainToGlobal(
  axisDelta: number,
  axisId: AxisId,
  score: HealthScoreResult,
): number | null {
  let totalKnown = 0;
  for (const id of Object.keys(score.axes) as AxisId[]) {
    if (score.axes[id].confidence !== "UNKNOWN") {
      totalKnown += AXIS_WEIGHTS[id];
    }
  }
  if (totalKnown <= 0) return null;
  const renorm = AXIS_WEIGHTS[axisId] / totalKnown;
  const projected = round(axisDelta * renorm, 2);
  return roundInt(projected);
}

/* -------------------------------------------------------------------------- */
/*  tiny utils                                                                 */
/* -------------------------------------------------------------------------- */

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}
