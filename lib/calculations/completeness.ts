import type {
  CategoryBudget,
  Expense,
  Goal,
  Income,
} from "@/types/database";

/**
 * Phase 3.1.5 — financial completeness.
 * Phase 3.1.6 — split into three scores so the coach can pick the
 * right one for the right question (structural confidence vs.
 * optimisation depth).
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
 * Three scores (each 0–100, weights sum to exactly 100):
 *
 *   - Structurelle (V2) — the 5 areas that model the household:
 *       income · housing · insurance · food · transport
 *     The coach uses THIS one to gate confidence: "do I know enough
 *     about the user's basic structure to talk numbers?". A high
 *     structurelle means a reasonable scaffold; missing telecom or
 *     leisure doesn't make the analysis "unreliable" structurally.
 *
 *   - Détaillée — structurelle + telecom + subscriptions + leisure.
 *     The depth needed for credible OPTIMISATION analysis. When
 *     this drops below 70 we hide potential-savings projections to
 *     avoid the "tu peux économiser 8 CHF" failure mode the brief
 *     called out — those numbers are technically true but
 *     economically not credible.
 *
 *   - Optimale — détaillée + goal + per-category budget. The
 *     "fully set up" score: structurelle + détaillée + behavioural
 *     scaffolding (goals + budgets) the discipline / opportunity
 *     engine needs to be at its best.
 *
 * Two pure helpers:
 *   - computeFinancialCompleteness — all three scores + detected /
 *     missing areas + reliability tier derived from the STRUCTURELLE
 *     score (the headline the coach trusts).
 *   - detectMissingFinancialAreas — just the missing list with
 *     severity, suitable for the dashboard/coach context.
 *
 * Pure: no I/O, no clock. Easy to unit-test, deterministic.
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
  /** Integer 0-100 — the headline the coach uses by default. */
  score: number;
  /**
   * Phase 3.1.6 — three tiered scores so the coach can pick the
   * right one for the right question.
   */
  structurelle: number;
  detaillee: number;
  optimale: number;
  /** Areas present in the user's data. */
  detected: readonly FinancialArea[];
  /** Areas absent, with severity classification. */
  missing: readonly MissingArea[];
  /**
   * Tier derived from STRUCTURELLE (not Optimale!) so we never tell
   * the user their analysis is unreliable just because they haven't
   * yet defined a "goal" — the structural model is what matters for
   * trust:
   *   - high   when structurelle >= 90
   *   - medium when structurelle 70-89
   *   - low    when structurelle <  70
   */
  reliability: ReliabilityTier;
  /**
   * Whether the user has enough DEPTH (détaillée >= 70) for the
   * optimisation engine to credibly publish potential savings.
   * Below that threshold the UI hides the projection and the coach
   * pivots to "complete your data first".
   */
  canEstimateSavings: boolean;
}

/**
 * Per-area metadata. Weights per score tier; not every area
 * contributes to every score:
 *   - structurelle: income, housing, insurance, food, transport.
 *   - détaillée:    + telecom, subscriptions, leisure.
 *   - optimale:     + goal, category_budget.
 *
 * Within each tier the weights sum to EXACTLY 100, locked by tests.
 */
interface AreaRule {
  category: string;
  severity: Severity;
  /** 0 when the area doesn't contribute to the score in this tier. */
  weightStructurelle: number;
  weightDetaillee: number;
  weightOptimale: number;
}

const RULES: Record<FinancialArea, AreaRule> = {
  income: {
    category: "income",
    severity: "high",
    weightStructurelle: 25,
    weightDetaillee: 20,
    weightOptimale: 15,
  },
  housing: {
    category: "housing",
    severity: "high",
    weightStructurelle: 25,
    weightDetaillee: 20,
    weightOptimale: 15,
  },
  insurance: {
    category: "insurance",
    severity: "high",
    weightStructurelle: 20,
    weightDetaillee: 15,
    weightOptimale: 15,
  },
  food: {
    category: "food",
    severity: "medium",
    weightStructurelle: 15,
    weightDetaillee: 10,
    weightOptimale: 10,
  },
  transport: {
    category: "transport",
    severity: "medium",
    weightStructurelle: 15,
    weightDetaillee: 10,
    weightOptimale: 10,
  },
  telecom: {
    category: "utilities",
    severity: "medium",
    weightStructurelle: 0,
    weightDetaillee: 10,
    weightOptimale: 10,
  },
  subscriptions: {
    category: "subscriptions",
    severity: "medium",
    weightStructurelle: 0,
    weightDetaillee: 10,
    weightOptimale: 10,
  },
  leisure: {
    category: "leisure",
    severity: "low",
    weightStructurelle: 0,
    weightDetaillee: 5,
    weightOptimale: 5,
  },
  goal: {
    category: "goal",
    severity: "low",
    weightStructurelle: 0,
    weightDetaillee: 0,
    weightOptimale: 5,
  },
  category_budget: {
    category: "category_budget",
    severity: "low",
    weightStructurelle: 0,
    weightDetaillee: 0,
    weightOptimale: 5,
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
  let structurelle = 0;
  let detaillee = 0;
  let optimale = 0;
  for (const area of AREAS) {
    const present = isAreaPresent(area, input);
    if (present) {
      detected.push(area);
      structurelle += RULES[area].weightStructurelle;
      detaillee += RULES[area].weightDetaillee;
      optimale += RULES[area].weightOptimale;
    } else {
      missing.push({ area, severity: RULES[area].severity });
    }
  }
  return {
    // The headline score the dashboard's main card uses. We keep it
    // pointed at OPTIMALE so users see the full picture of what's
    // possible — but the trust gate (`reliability`) is anchored on
    // STRUCTURELLE so the coach never tells them their analysis is
    // unreliable just because they haven't formalised a goal yet.
    score: optimale,
    structurelle,
    detaillee,
    optimale,
    detected,
    missing,
    reliability: reliabilityFor(structurelle),
    canEstimateSavings: detaillee >= 70,
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

/** Sum of all weights — exported so the parity tests can verify it. */
export const COMPLETENESS_MAX_SCORE = AREAS.reduce(
  (s, a) => s + RULES[a].weightOptimale,
  0,
);

/** Exported so the parity tests can verify the per-tier sums. */
export const STRUCTURELLE_MAX_SCORE = AREAS.reduce(
  (s, a) => s + RULES[a].weightStructurelle,
  0,
);
export const DETAILLEE_MAX_SCORE = AREAS.reduce(
  (s, a) => s + RULES[a].weightDetaillee,
  0,
);
