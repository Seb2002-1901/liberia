import { clamp, round, roundInt } from "../utils";
import type { AxisConfidence, AxisResult } from "../types";

/**
 * Phase 3.2 — Axis 3 : Trajectoire (weight 20 %).
 *
 * Captures whether wealth is growing — the bare savings rate, capped
 * at 25 % to avoid rewarding aberrational windfall months.
 *
 *   savings_rate = (income_used - fixed) / income_used
 *   score        = clamp(round(savings_rate × 400), 0, 100)
 *
 * income_used is the 3-month average when available — smooths over
 * one-off bonuses / slow months so a freelancer's score is honest.
 */

export interface TrajectoireInput {
  /** Current month declared monthly income (sum of recurring incomes). */
  monthlyIncome: number;
  /** Sum of recurring monthly fixed expenses. */
  monthlyExpensesFixed: number;
  /**
   * 3-month rolling average of monthly income. null when fewer than
   * 3 months of data exist — in which case monthlyIncome is used.
   */
  history3mIncomeAvg: number | null;
  /** Total months of income history observed (0, 1, 2 or 3). */
  incomeHistoryMonths: number;
}

const SAVINGS_RATE_MULTIPLIER = 400;

export function computeTrajectoire(input: TrajectoireInput): AxisResult {
  const {
    monthlyIncome,
    monthlyExpensesFixed,
    history3mIncomeAvg,
    incomeHistoryMonths,
  } = input;

  const incomeUsed = history3mIncomeAvg ?? monthlyIncome;

  // No income at all → axis cannot be computed.
  if (incomeUsed <= 0) {
    return {
      id: "trajectoire",
      score: 0,
      confidence: "UNKNOWN",
      components: {
        savings_rate: 0,
        income_used: 0,
        fixed: monthlyExpensesFixed,
      },
    };
  }

  const savingsRate = (incomeUsed - monthlyExpensesFixed) / incomeUsed;
  const score = clamp(
    roundInt(savingsRate * SAVINGS_RATE_MULTIPLIER),
    0,
    100,
  );

  return {
    id: "trajectoire",
    score,
    confidence: resolveConfidence(
      monthlyIncome,
      monthlyExpensesFixed,
      incomeHistoryMonths,
    ),
    components: {
      savings_rate: round(savingsRate, 4),
      income_used: round(incomeUsed, 2),
      fixed: monthlyExpensesFixed,
    },
  };
}

function resolveConfidence(
  monthlyIncome: number,
  monthlyExpensesFixed: number,
  historyMonths: number,
): AxisConfidence {
  if (monthlyIncome <= 0) return "UNKNOWN";
  if (monthlyExpensesFixed <= 0) return "LOW";
  if (historyMonths >= 2) return "HIGH";
  return "MEDIUM";
}
