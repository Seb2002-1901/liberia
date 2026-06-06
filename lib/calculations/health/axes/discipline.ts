import { clamp, roundInt } from "../utils";
import type { AxisConfidence, AxisResult } from "../types";

/**
 * Phase 3.2 — Axis 1 : Discipline (weight 25 %).
 *
 * Two sub-components, weighted 60/40 :
 *   - budget_score : % budgets SUCCESS this month, with a +5 bonus
 *     when ALL budgets sit under 70 % of target, and a -10 malus
 *     when ANY budget is critically over (> 120 % of target).
 *   - savings_consistency : how stable the monthly savings rate is
 *     over the last 3 months. 1 - σ/0.10 normalised to 0-100.
 *
 * The axis weight 0.6/0.4 between the two sub-components is FROZEN
 * for v1.0. Changing it requires bumping FHS_VERSION.
 */

export interface DisciplineBudgetSnapshot {
  status: "SUCCESS" | "WARNING" | "OVER_LIMIT";
  /** currentSpent / targetAmount as 0..>1. */
  percentage: number;
}

export interface DisciplineInput {
  /** Per-budget snapshot for the current month. Empty = no budgets defined. */
  budgets: readonly DisciplineBudgetSnapshot[];
  /**
   * Savings rates of the last N months (oldest first), up to 3.
   * Use the dimensionless ratio, e.g. 0.15 for 15 %.
   */
  savingsRatesByMonth: readonly number[];
}

const NEUTRAL_SAVINGS_CONSISTENCY = 70;
const BUDGET_BONUS_ALL_UNDER_70 = 5;
const BUDGET_MALUS_CRITICAL_OVERAGE = 10;
const SAVINGS_VOLATILITY_NORM = 0.10;
const CRITICAL_OVERAGE_RATIO = 1.20;
const BUDGET_WEIGHT = 0.6;
const SAVINGS_WEIGHT = 0.4;

export function computeDiscipline(input: DisciplineInput): AxisResult {
  const { budgets, savingsRatesByMonth } = input;

  const successCount = budgets.filter((b) => b.status === "SUCCESS").length;
  const criticalCount = budgets.filter(
    (b) => b.status === "OVER_LIMIT" && b.percentage > CRITICAL_OVERAGE_RATIO,
  ).length;
  const allUnder70 =
    budgets.length > 0 && budgets.every((b) => b.percentage < 0.7);

  // Sub-component 1 — budget_score, only meaningful when budgets exist.
  let budgetScore = 0;
  if (budgets.length > 0) {
    let base = (successCount / budgets.length) * 100;
    if (allUnder70) base += BUDGET_BONUS_ALL_UNDER_70;
    if (criticalCount > 0) base -= BUDGET_MALUS_CRITICAL_OVERAGE;
    budgetScore = clamp(base, 0, 100);
  }

  // Sub-component 2 — savings_consistency.
  // < 2 months : σ not estimable, neutral default per calibration doc.
  let savingsConsistency = NEUTRAL_SAVINGS_CONSISTENCY;
  if (savingsRatesByMonth.length >= 2) {
    const mean =
      savingsRatesByMonth.reduce((s, r) => s + r, 0) /
      savingsRatesByMonth.length;
    const variance =
      savingsRatesByMonth.reduce((s, r) => s + (r - mean) ** 2, 0) /
      savingsRatesByMonth.length;
    const sigma = Math.sqrt(variance);
    savingsConsistency =
      100 * (1 - clamp(sigma / SAVINGS_VOLATILITY_NORM, 0, 1));
  }

  // Combine — when no budgets, axis reduces to savings_consistency alone.
  const score =
    budgets.length > 0
      ? roundInt(BUDGET_WEIGHT * budgetScore + SAVINGS_WEIGHT * savingsConsistency)
      : roundInt(savingsConsistency);

  const confidence = resolveConfidence(budgets.length, savingsRatesByMonth.length);

  return {
    id: "discipline",
    score: clamp(score, 0, 100),
    confidence,
    components: {
      budget_score: roundInt(budgetScore),
      savings_consistency: roundInt(savingsConsistency),
      budgets_total: budgets.length,
      budgets_success: successCount,
      budgets_critical: criticalCount,
    },
  };
}

function resolveConfidence(
  nBudgets: number,
  nMonths: number,
): AxisConfidence {
  if (nBudgets >= 3 && nMonths >= 3) return "HIGH";
  if (nBudgets >= 1 || nMonths >= 2) return "MEDIUM";
  if (nMonths >= 1) return "LOW";
  return "UNKNOWN";
}
