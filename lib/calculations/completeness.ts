import type {
  CategoryBudget,
  Expense,
  Goal,
  Income,
} from "@/types/database";

/**
 * Phase 3.1.5 — financial completeness.
 *
 * The optimisation engine is only as good as the data the user has
 * actually entered. With Revenus 25 000, Logement 15 000 and
 * Alimentation 42 CHF the math says "tu peux économiser 8 CHF/mois"
 * — true, but useless because the user obviously also has
 * insurance, transport, telecom, subscriptions… that just aren't
 * recorded. This module surfaces THAT gap, before any
 * recommendation lands, so the coach and the UI know to be modest
 * about their conclusions.
 *
 * Two pure helpers:
 *   - computeFinancialCompleteness — score 0-100 with detected and
 *     missing areas + a reliability tier.
 *   - detectMissingFinancialAreas — just the missing list with
 *     severity, suitable for the dashboard/coach context.
 *
 * Pure: no I/O, no clock. Easy to unit-test, deterministic.
 *
 * Vocabulary note: "telecom" maps to EXPENSE_CATEGORIES.utilities
 * (factures & énergie, includes phone/internet/cable). We surface
 * the canonical EXPENSE_CATEGORIES id everywhere so the UI can
 * reuse its existing label/i18n machinery without a new mapping.
 */

/** Finance areas the completeness score evaluates. */
export type FinancialArea =
  | "income"
  | "housing"
  | "food"
  | "insurance"
  | "transport"
  | "telecom"
  | "subscriptions"
  | "leisure"
  | "goal"
  | "category_budget";

export type Severity = "low" | "medium" | "high";

export interface MissingArea {
  area: FinancialArea;
  severity: Severity;
}

export type ReliabilityTier = "high" | "medium" | "low";

export interface CompletenessInput {
  incomes: readonly Income[];
  expenses: readonly Expense[];
  goals: readonly Goal[];
  categoryBudgets: readonly CategoryBudget[];
}

export interface CompletenessResult {
  /** Integer 0-100. */
  score: number;
  /** Areas present in the user's data. */
  detected: readonly FinancialArea[];
  /** Areas absent, with severity classification. */
  missing: readonly MissingArea[];
  /**
   * Reliability tier the analytics page / coach use to decide
   * whether to surface a "your data may be incomplete" warning:
   *   - high   when score >= 90
   *   - medium when score 70-89
   *   - low    when score <  70
   *
   * Locked to those thresholds because the UI palette + the coach
   * rule both depend on them.
   */
  reliability: ReliabilityTier;
}

/**
 * Weight + detection rule per area. The total of all weights is
 * exactly 100 — enforced by the test `weights sum to 100`.
 */
interface AreaRule {
  weight: number;
  /** Maps to an EXPENSE_CATEGORIES id (or "income" / "goal" / "category_budget"). */
  category: string;
  severity: Severity;
}

const RULES: Record<FinancialArea, AreaRule> = {
  income: { weight: 15, category: "income", severity: "high" },
  housing: { weight: 15, category: "housing", severity: "high" },
  food: { weight: 10, category: "food", severity: "medium" },
  insurance: { weight: 15, category: "insurance", severity: "high" },
  transport: { weight: 10, category: "transport", severity: "medium" },
  telecom: { weight: 10, category: "utilities", severity: "medium" },
  subscriptions: { weight: 10, category: "subscriptions", severity: "medium" },
  leisure: { weight: 5, category: "leisure", severity: "low" },
  goal: { weight: 5, category: "goal", severity: "low" },
  category_budget: {
    weight: 5,
    category: "category_budget",
    severity: "low",
  },
};

const AREAS = Object.keys(RULES) as readonly FinancialArea[];

function isAreaPresent(area: FinancialArea, input: CompletenessInput): boolean {
  switch (area) {
    case "income":
      return input.incomes.length > 0;
    case "goal":
      return input.goals.length > 0;
    case "category_budget":
      return input.categoryBudgets.length > 0;
    default: {
      // For every "expense" area we check whether at least one
      // expense in that category exists (any frequency: a single
      // recurring rent counts as housing present). We don't require
      // the user to have logged a one-off in the current month.
      const id = RULES[area].category;
      return input.expenses.some((e) => e.category === id);
    }
  }
}

function reliabilityFor(score: number): ReliabilityTier {
  if (score >= 90) return "high";
  if (score >= 70) return "medium";
  return "low";
}

export function computeFinancialCompleteness(
  input: CompletenessInput,
): CompletenessResult {
  const detected: FinancialArea[] = [];
  const missing: MissingArea[] = [];
  let score = 0;
  for (const area of AREAS) {
    const present = isAreaPresent(area, input);
    if (present) {
      detected.push(area);
      score += RULES[area].weight;
    } else {
      missing.push({ area, severity: RULES[area].severity });
    }
  }
  return {
    score,
    detected,
    missing,
    reliability: reliabilityFor(score),
  };
}

/**
 * Same logic as computeFinancialCompleteness but returns ONLY the
 * missing list — sorted by severity (high first). Convenience for
 * the dashboard card and coach context which don't need the detected
 * list. Idempotent with computeFinancialCompleteness().missing.
 */
export function detectMissingFinancialAreas(
  input: CompletenessInput,
): MissingArea[] {
  const out = computeFinancialCompleteness(input).missing.slice();
  const weight: Record<Severity, number> = { high: 3, medium: 2, low: 1 };
  out.sort((a, b) => weight[b.severity] - weight[a.severity]);
  return out;
}

/** Sum of all weights — exported so the parity test can verify it. */
export const COMPLETENESS_MAX_SCORE = AREAS.reduce(
  (s, a) => s + RULES[a].weight,
  0,
);
