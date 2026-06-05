import type { CategoryBudgetEntry } from "@/lib/calculations/analytics";
import type { Opportunity, OpportunityPriority } from "@/lib/calculations/opportunities";
import {
  buildCategoryBreakdown,
  type AnalyticsExpense,
} from "@/lib/calculations/analytics";

/**
 * Phase 3.1.4 — budget-goals primitives.
 *
 * Three pure helpers that wrap the existing analytics primitives
 * with a sharper, more explicit shape. They DON'T replace
 * buildBudgetStatus — that primitive stays as the analytics-level
 * computation. These three speak the language the dashboard and the
 * coach need:
 *
 *   - computeBudgetProgress       — per-category goal progress with
 *                                   status SUCCESS / WARNING /
 *                                   OVER_LIMIT and explicit
 *                                   targetAmount / currentSpent /
 *                                   remaining / overrun / percentage.
 *   - computeGoalAchievementScore — "how many of my budgets did I
 *                                   respect this month?" — exposed
 *                                   as a 0-1 score and a
 *                                   respected/total fraction.
 *   - computePotentialSavings     — aggregate monthly + yearly
 *                                   impact across an Opportunity
 *                                   list, with per-priority
 *                                   breakdown so the dashboard card
 *                                   can show the high-priority
 *                                   subset prominently.
 *
 * All three are 100 % pure: no I/O, no side effects, no clock unless
 * injected. Easy to test, easy to reason about.
 */

export type BudgetProgressStatus = "SUCCESS" | "WARNING" | "OVER_LIMIT";

export interface BudgetProgress {
  category: string;
  /** Monthly limit set by the user. */
  targetAmount: number;
  /** What they actually spent this month in this category. */
  currentSpent: number;
  /** targetAmount - currentSpent. Negative when over budget. */
  remaining: number;
  /** Positive amount over budget — 0 when on or under target. */
  overrun: number;
  /** currentSpent / targetAmount as a 0-1 fraction (or higher when
   *  over). 0 when targetAmount is 0 (defensive). */
  percentage: number;
  /**
   * SUCCESS    — < 80 % of target
   * WARNING    — 80–100 %
   * OVER_LIMIT — > 100 %
   *
   * Capitalised on purpose: this is the i18n key the UI selects
   * its colour + copy with, and it must NEVER drift from the lowercase
   * `BudgetStatusRow.status` the analytics primitive uses (that one
   * stays for the existing analytics surfaces). Both express the
   * same boundaries.
   */
  status: BudgetProgressStatus;
}

/**
 * Per-category progress. Categories without a configured budget
 * are NOT included — they're not relevant to "did you respect your
 * goals". Use buildCategoryBreakdown directly for the full list.
 */
export function computeBudgetProgress(
  budgets: readonly CategoryBudgetEntry[],
  expenses: readonly AnalyticsExpense[],
  now: Date = new Date(),
): BudgetProgress[] {
  if (budgets.length === 0) return [];

  // Reuse the same category-breakdown primitive the analytics page
  // and the existing buildBudgetStatus rely on, so all surfaces
  // agree to the cent on what was spent in each budgeted category.
  const breakdown = buildCategoryBreakdown(
    expenses,
    "month",
    budgets.map((b) => b.category),
    now,
  );
  const spentByCategory = new Map(breakdown.map((r) => [r.category, r.total]));

  return budgets.map((b) => {
    const currentSpent = spentByCategory.get(b.category) ?? 0;
    const target = b.monthly_limit;
    const remaining = target - currentSpent;
    const overrun = Math.max(0, currentSpent - target);
    const percentage = target > 0 ? currentSpent / target : 0;
    const status: BudgetProgressStatus =
      percentage > 1 ? "OVER_LIMIT" : percentage >= 0.8 ? "WARNING" : "SUCCESS";
    return {
      category: b.category,
      targetAmount: target,
      currentSpent,
      remaining,
      overrun,
      percentage,
      status,
    };
  });
}

export interface GoalAchievementScore {
  /** Count of budgets with status === "SUCCESS". */
  respected: number;
  /** Total budgets considered. */
  total: number;
  /** respected / total as a 0-1 fraction. 0 when total === 0. */
  score: number;
}

/**
 * "How many of my budgets did I respect?" — the question that turns
 * the per-category progress into a single headline number.
 *
 * Definition of "respected" = status SUCCESS (i.e. < 80 % of the
 * target). WARNING and OVER_LIMIT both count as not respected — a
 * budget at 95 % use is technically not over but the user hasn't
 * finished the month yet, and treating it as "respected" today
 * would inflate the score on the 28th and flip it on the 30th.
 *
 * Returns score=0, total=0 when no budgets are set so the dashboard
 * card can show "No goal set yet — define your first budget" rather
 * than a misleading 100 %.
 */
export function computeGoalAchievementScore(
  progress: readonly BudgetProgress[],
): GoalAchievementScore {
  if (progress.length === 0) {
    return { respected: 0, total: 0, score: 0 };
  }
  const respected = progress.filter((p) => p.status === "SUCCESS").length;
  return {
    respected,
    total: progress.length,
    score: respected / progress.length,
  };
}

export interface PotentialSavings {
  /** Sum of monthlyImpact across ALL opportunities. */
  monthly: number;
  /** monthly * 12. Sums of yearlyImpact yield the same — we compute
   *  once for consistency. */
  yearly: number;
  /** Same numbers, broken down by priority bucket. */
  byPriority: Record<OpportunityPriority, { monthly: number; yearly: number }>;
}

/**
 * Aggregate the monetary impact of a list of opportunities so the
 * dashboard and the coach can answer "combien puis-je économiser ?"
 * with a single number, plus the per-priority breakdown for the UI
 * to highlight the high-priority subset.
 */
export function computePotentialSavings(
  opportunities: readonly Opportunity[],
): PotentialSavings {
  const byPriority: PotentialSavings["byPriority"] = {
    high: { monthly: 0, yearly: 0 },
    medium: { monthly: 0, yearly: 0 },
    low: { monthly: 0, yearly: 0 },
  };
  let monthly = 0;
  let yearly = 0;
  for (const o of opportunities) {
    monthly += o.monthlyImpact;
    yearly += o.yearlyImpact;
    byPriority[o.priority].monthly += o.monthlyImpact;
    byPriority[o.priority].yearly += o.yearlyImpact;
  }
  return { monthly, yearly, byPriority };
}
