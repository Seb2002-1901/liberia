import { clamp, round, roundInt } from "../utils";
import type { AxisConfidence, AxisResult } from "../types";

/**
 * Phase 3.2 — Axis 5 : Objectifs (weight 10 %).
 *
 * Rewards directional intent : do you have an active goal, and are
 * you closing the gap ?
 *
 *   if active goal(s) :
 *     score = 50 + 50 × avg(progress)
 *   else if at least one goal was ever completed :
 *     score = 30
 *   else :
 *     score = 0
 *
 * The "30 after lifetime completion" tier is intentional — without
 * it, completing a goal would crash the score by 50 points, which
 * would be morally wrong. The user keeps a residual reward until
 * they set the next goal.
 */

export interface ObjectifsGoalSnapshot {
  target_amount: number;
  current_amount: number;
}

export interface ObjectifsInput {
  /** Non-archived, non-completed goals. */
  activeGoals: readonly ObjectifsGoalSnapshot[];
  /** Lifetime count of goals that have ever reached completion. */
  completedGoalsCount: number;
  /**
   * Whether the profile shows ANY financial activity (income or
   * exploitable expenses). Used by the confidence rollup to decide
   * between LOW ("no goals but profile is alive") and UNKNOWN ("empty
   * account").
   */
  profileHasActivity: boolean;
}

const BASE_WITH_ACTIVE_GOAL = 50;
const SCORE_AFTER_LIFETIME_COMPLETION = 30;

export function computeObjectifs(input: ObjectifsInput): AxisResult {
  const { activeGoals, completedGoalsCount, profileHasActivity } = input;

  // Filter on goals with a positive target — a goal of 0 CHF cannot
  // have meaningful progress.
  const chiffredGoals = activeGoals.filter((g) => g.target_amount > 0);

  let score: number;
  let avgProgress = 0;

  if (chiffredGoals.length >= 1) {
    avgProgress =
      chiffredGoals.reduce(
        (s, g) => s + Math.min(1, g.current_amount / g.target_amount),
        0,
      ) / chiffredGoals.length;
    score = roundInt(BASE_WITH_ACTIVE_GOAL + 50 * avgProgress);
  } else if (activeGoals.length >= 1) {
    // Goal exists but no chiffred target — half credit.
    score = roundInt(BASE_WITH_ACTIVE_GOAL);
  } else if (completedGoalsCount >= 1) {
    score = SCORE_AFTER_LIFETIME_COMPLETION;
  } else {
    score = 0;
  }

  return {
    id: "objectifs",
    score: clamp(score, 0, 100),
    confidence: resolveConfidence(
      chiffredGoals.length,
      activeGoals.length,
      profileHasActivity,
    ),
    components: {
      active_count: activeGoals.length,
      chiffred_count: chiffredGoals.length,
      avg_progress: round(avgProgress, 4),
      ever_completed: completedGoalsCount,
    },
  };
}

function resolveConfidence(
  chiffredCount: number,
  activeCount: number,
  profileHasActivity: boolean,
): AxisConfidence {
  if (chiffredCount >= 1) return "HIGH";
  if (activeCount >= 1) return "MEDIUM";
  if (profileHasActivity) return "LOW";
  return "UNKNOWN";
}
