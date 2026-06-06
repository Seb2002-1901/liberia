import { clamp, round, roundInt } from "../utils";
import type { AxisConfidence, AxisResult } from "../types";

/**
 * Phase 3.2 — Axis 2 : Résilience (weight 25 %).
 *
 * Measures the user's ability to absorb a shock — months of fixed
 * expenses covered by current savings.
 *
 *   runway = currentSavings / monthlyExpensesFixed
 *   score  = clamp(round(log2(1 + runway) × 28), 0, 100)
 *
 * The log scale reflects diminishing marginal utility : going from
 * 1 to 2 months matters more than going from 11 to 12. The constant
 * 28 calibrates the curve so 3 months ≈ 56, 6 months ≈ 78, 12+ → 100.
 */

export interface ResilienceInput {
  /** Total liquid savings declared by the user. null = not entered yet. */
  currentSavings: number | null;
  /** Sum of recurring monthly fixed expenses (rent, insurance, …). */
  monthlyExpensesFixed: number;
  /**
   * How many distinct fixed-expense categories the user has declared.
   * Drives the HIGH/MEDIUM confidence split (≥ 3 vs < 3 categories).
   */
  fixedExpensesCategoryCount: number;
}

const LOG_SCALE = 28;
const HIGH_CONFIDENCE_MIN_CATEGORIES = 3;

export function computeResilience(input: ResilienceInput): AxisResult {
  const { currentSavings, monthlyExpensesFixed, fixedExpensesCategoryCount } =
    input;

  // currentSavings not entered → axis cannot be computed.
  if (currentSavings === null) {
    return {
      id: "resilience",
      score: 0,
      confidence: "UNKNOWN",
      components: {
        runway_months: 0,
        saved: 0,
        monthly_burn: monthlyExpensesFixed,
      },
    };
  }

  // No fixed expenses recorded → runway is undefined ; we surface the
  // score as 100 with LOW confidence so the user is not penalised but
  // the drawer flags it ("complete fixed expenses for a real read").
  if (monthlyExpensesFixed <= 0) {
    return {
      id: "resilience",
      score: 100,
      confidence: "LOW",
      components: {
        runway_months: 0,
        saved: currentSavings,
        monthly_burn: 0,
      },
    };
  }

  const runway = currentSavings / monthlyExpensesFixed;
  const score = clamp(roundInt(Math.log2(1 + runway) * LOG_SCALE), 0, 100);

  return {
    id: "resilience",
    score,
    confidence: resolveConfidence(
      currentSavings,
      fixedExpensesCategoryCount,
    ),
    components: {
      runway_months: round(runway, 2),
      saved: currentSavings,
      monthly_burn: monthlyExpensesFixed,
    },
  };
}

function resolveConfidence(
  currentSavings: number,
  fixedCategoryCount: number,
): AxisConfidence {
  // currentSavings = 0 : per calibration doc, LOW (can't tell if it's
  // really zero or just not entered yet).
  if (currentSavings === 0) return "LOW";
  if (fixedCategoryCount >= HIGH_CONFIDENCE_MIN_CATEGORIES) return "HIGH";
  return "MEDIUM";
}
