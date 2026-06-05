import type { BudgetStatusRow } from "@/lib/calculations/analytics";

/**
 * Phase 3.1.3 — discipline score.
 *
 * A single 0-100 number summarising whether the user is in control
 * of their money this month. It's NOT a credit score, NOT a moral
 * judgement, just a quick gauge to anchor the coach's narrative and
 * the dashboard at-a-glance card.
 *
 * Components (each contributes a bounded fraction of 100):
 *   - Budget adherence — 35 pts. Fraction of budgeted categories
 *     that are in `ok` status this month. No budgets configured = 0
 *     contribution (we don't punish the user for not setting any).
 *   - Savings rate     — 30 pts. Anchored at 0 % = 0, 20 % = full.
 *   - Emergency fund   — 25 pts. Anchored at 0 months = 0, 3 months
 *     = full. Beyond 3 months we cap — there's no extra credit for
 *     hoarding cash here.
 *   - Tracking activity — 10 pts. Has the user logged at least one
 *     variable transaction this month? Yes = full, no = 0. The idea
 *     is to nudge engagement, not penalise sober months.
 *
 * Returns the score, the per-component sub-scores (so the analytics
 * page can render an explainer), and a tier label that drives the
 * card colour. Pure function — easy to test, no I/O.
 */

export type DisciplineTier = "low" | "fair" | "good" | "excellent";

export interface DisciplineInput {
  /** Result of buildBudgetStatus(...) — may be empty. */
  budgetStatus: readonly BudgetStatusRow[];
  /** As a decimal (0.15 = 15 %). */
  savingsRate: number;
  /** Months of expenses covered by current savings. */
  runwayMonths: number;
  /** Count of one_time tx logged this month. */
  monthlyTransactions: number;
}

export interface DisciplineBreakdown {
  budget: number;
  savings: number;
  emergency: number;
  tracking: number;
}

export interface DisciplineResult {
  /** Integer 0-100 — the headline. */
  score: number;
  tier: DisciplineTier;
  breakdown: DisciplineBreakdown;
  /**
   * Stable identifier of the dominant weakness for i18n lookup.
   * "budget" when at least one category is over;
   * "savings" when savings rate < 5 %;
   * "emergency" when runway < 1 month;
   * "none" when nothing in particular is weak.
   * Used by the dashboard / analytics card to render a one-liner.
   */
  weakest:
    | "budget"
    | "savings"
    | "emergency"
    | "none";
}

const WEIGHTS = {
  budget: 35,
  savings: 30,
  emergency: 25,
  tracking: 10,
} as const;

export function computeDisciplineScore(
  input: DisciplineInput,
): DisciplineResult {
  // --- Budget adherence ---
  // Only count categories that have a budget — no penalty for
  // "no budgets yet". When zero are configured, budget component
  // is 0 and the user can still reach a perfect score on the other
  // axes (savings/emergency/tracking) if they're doing well.
  let budgetScore = 0;
  if (input.budgetStatus.length > 0) {
    const okCount = input.budgetStatus.filter((r) => r.status === "ok").length;
    budgetScore = (okCount / input.budgetStatus.length) * WEIGHTS.budget;
  }

  // --- Savings rate ---
  // 0 % → 0 ; 20 %+ → full credit. We cap above 20 % so a single
  // outlier month with a one-off windfall doesn't dominate.
  const savingsScore =
    clamp01(input.savingsRate / 0.2) * WEIGHTS.savings;

  // --- Emergency fund ---
  // 0 months → 0 ; 3 months+ → full credit. The classic "3 months
  // of expenses" rule of thumb. Beyond that this metric is saturated.
  const runwayCapped = Number.isFinite(input.runwayMonths)
    ? input.runwayMonths
    : 12;
  const emergencyScore =
    clamp01(runwayCapped / 3) * WEIGHTS.emergency;

  // --- Tracking activity ---
  // Binary: did the user log at least one variable transaction this
  // month? This nudges adoption of the coach's propose_expense flow
  // and the manual /expenses entry without becoming a treadmill.
  const trackingScore = input.monthlyTransactions > 0 ? WEIGHTS.tracking : 0;

  const total = Math.round(
    budgetScore + savingsScore + emergencyScore + trackingScore,
  );
  const score = Math.max(0, Math.min(100, total));

  return {
    score,
    tier: tierFor(score),
    breakdown: {
      budget: Math.round(budgetScore),
      savings: Math.round(savingsScore),
      emergency: Math.round(emergencyScore),
      tracking: Math.round(trackingScore),
    },
    weakest: pickWeakest(input),
  };
}

function tierFor(score: number): DisciplineTier {
  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 40) return "fair";
  return "low";
}

function pickWeakest(input: DisciplineInput): DisciplineResult["weakest"] {
  // Order of severity: an actively over-budget category is the most
  // concrete pain point; then a missing emergency fund; then a low
  // savings rate. "none" only when the user is healthy across the
  // board.
  if (input.budgetStatus.some((r) => r.status === "over")) return "budget";
  if (Number.isFinite(input.runwayMonths) && input.runwayMonths < 1) {
    return "emergency";
  }
  if (input.savingsRate < 0.05) return "savings";
  return "none";
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
