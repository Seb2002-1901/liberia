import type { BudgetStatusRow, CategoryBreakdownRow } from "@/lib/calculations/analytics";
import type { ExpenseBuckets } from "@/lib/calculations/aggregate";

/**
 * Phase 3.1.3 — opportunities engine.
 *
 * Pure function over the user's current snapshot returning a small
 * list of typed, prioritised opportunities to act on. The dashboard
 * does NOT display these — only /expenses/analytics does, and the
 * coach reads the top items to anchor its narrative.
 *
 * Hard rules:
 *   - At most MAX_OPPORTUNITIES entries (we don't flood the user).
 *   - Each entry has a stable `kind` so i18n can render a localised
 *     title + explanation client-side from a single string table.
 *   - Numbers are derived from the data we already have. We never
 *     invent market benchmarks (a key constraint of the spec).
 */

export type OpportunityKind =
  | "budget_over"
  | "high_variable_share"
  | "low_emergency_fund"
  | "high_fixed_ratio"
  | "high_insurance_share"
  | "high_subscriptions_share"
  | "audit_top_variable_category"
  | "dominant_category"
  | "low_savings_rate";

export type OpportunityPriority = "low" | "medium" | "high";

export interface Opportunity {
  kind: OpportunityKind;
  /** Stable string for the priority badge — i18n decides the label. */
  priority: OpportunityPriority;
  /**
   * Free-form i18n payload — varies per kind. The UI translates the
   * title and explanation via `app.finance.analytics.opportunities
   * .<kind>.*` and passes `payload` as ICU args.
   */
  payload: Record<string, string | number>;
  /** Monthly impact estimate in user currency (signed positive). */
  monthlyImpact: number;
  /** Yearly impact = monthlyImpact * 12 (computed for convenience). */
  yearlyImpact: number;
  /**
   * Phase 3.1.4 — stable action key for i18n lookup. The UI renders
   * the localised verb-phrase ("Réduire les dépenses de
   * restauration") so the user immediately sees WHAT to do, not just
   * what's wrong. The coach reads this too as a concrete CTA.
   */
  action: string;
}

export interface DetectInput {
  expenseBuckets: ExpenseBuckets;
  budgetStatus: readonly BudgetStatusRow[];
  /** "this month" category breakdown — sorted by total desc. */
  categoryBreakdown: readonly CategoryBreakdownRow[];
  monthlyIncome: number;
  runwayMonths: number;
  /**
   * Phase 3.1.4 — savings rate (decimal, e.g. 0.12 for 12 %).
   * Optional so existing callers don't have to pass it before they
   * compute it; rules that need it just no-op when undefined.
   */
  savingsRate?: number;
}

const MAX_OPPORTUNITIES = 5;

const HIGH_FIXED_RATIO = 0.6; // fixed > 60 % of income is heavy
const HIGH_VARIABLE_SHARE = 0.25; // variable > 25 % of income is loose
const HIGH_INSURANCE_SHARE = 0.07; // insurance > 7 % of income worth auditing
const HIGH_SUBSCRIPTIONS_SHARE = 0.04;
const TOP_VARIABLE_CATEGORY_SHARE = 0.25; // top variable cat > 25 % of variable
const DOMINANT_CATEGORY_SHARE = 0.5; // single category > 50 % of total spend
const LOW_SAVINGS_RATE = 0.05; // savings rate < 5 % is a flag

export function detectOpportunities(input: DetectInput): Opportunity[] {
  const out: Opportunity[] = [];
  const {
    expenseBuckets,
    budgetStatus,
    categoryBreakdown,
    monthlyIncome,
    runwayMonths,
    savingsRate,
  } = input;

  // 1) Budget over — one entry per over-budget category, capped at 2
  //    here (the top two by absolute overrun). Priority high if the
  //    overrun is > 20 % of the limit; medium otherwise.
  const overruns = budgetStatus
    .filter((b) => b.status === "over")
    .sort((a, b) => -a.remaining - -b.remaining); // most negative remaining first
  for (const o of overruns.slice(0, 2)) {
    const overshoot = -o.remaining; // positive number
    const priority: OpportunityPriority =
      o.limit > 0 && overshoot / o.limit > 0.2 ? "high" : "medium";
    push(out, {
      kind: "budget_over",
      priority,
      payload: {
        category: o.category,
        amount: round2(overshoot),
        limit: round2(o.limit),
      },
      monthlyImpact: round2(overshoot),
      yearlyImpact: round2(overshoot * 12),
      action: `reduce_${o.category}`,
    });
  }

  // 2) High variable share — when one_time spending this month is
  //    > 25 % of income, the user is leaking through small cuts.
  //    Impact estimate: assume bringing it to 15 % would free
  //    (variable - 0.15 * income).
  if (
    monthlyIncome > 0 &&
    expenseBuckets.variable / monthlyIncome > HIGH_VARIABLE_SHARE
  ) {
    const target = 0.15 * monthlyIncome;
    const impact = Math.max(0, expenseBuckets.variable - target);
    push(out, {
      kind: "high_variable_share",
      priority: "medium",
      payload: {
        share: round2((expenseBuckets.variable / monthlyIncome) * 100),
        variable: round2(expenseBuckets.variable),
      },
      monthlyImpact: round2(impact),
      yearlyImpact: round2(impact * 12),
      action: "cap_variable_spending",
    });
  }

  // 3) Low emergency fund — runway < 1 month is a fragility signal.
  //    No direct monthly impact, but flagging it pushes the user to
  //    redirect part of their variable spend. Priority high < 1 month,
  //    medium 1-3 months.
  if (Number.isFinite(runwayMonths)) {
    if (runwayMonths < 1) {
      push(out, {
        kind: "low_emergency_fund",
        priority: "high",
        payload: {
          months: round2(runwayMonths),
        },
        monthlyImpact: 0,
        yearlyImpact: 0,
        action: "build_emergency_fund",
      });
    } else if (runwayMonths < 3) {
      push(out, {
        kind: "low_emergency_fund",
        priority: "medium",
        payload: { months: round2(runwayMonths) },
        monthlyImpact: 0,
        yearlyImpact: 0,
        action: "build_emergency_fund",
      });
    }
  }

  // 4) High fixed ratio — recurring > 60 % of income leaves no room
  //    to manoeuvre. Pointing it to the user opens conversations about
  //    insurance, subscriptions, utility audits.
  if (monthlyIncome > 0 && expenseBuckets.fixed / monthlyIncome > HIGH_FIXED_RATIO) {
    push(out, {
      kind: "high_fixed_ratio",
      priority: "medium",
      payload: {
        share: round2((expenseBuckets.fixed / monthlyIncome) * 100),
        fixed: round2(expenseBuckets.fixed),
      },
      monthlyImpact: 0,
      yearlyImpact: 0,
      action: "audit_fixed_costs",
    });
  }

  // 5) Insurance share — the canonical Swiss audit lever.
  if (monthlyIncome > 0) {
    const insurance = findCategoryTotal(categoryBreakdown, "insurance");
    if (insurance / monthlyIncome > HIGH_INSURANCE_SHARE) {
      push(out, {
        kind: "high_insurance_share",
        priority: "low",
        payload: {
          share: round2((insurance / monthlyIncome) * 100),
          amount: round2(insurance),
        },
        monthlyImpact: 0,
        yearlyImpact: 0,
        action: "compare_insurance_premiums",
      });
    }
  }

  // 6) Subscriptions audit — same pattern, much smaller threshold.
  if (monthlyIncome > 0) {
    const subs = findCategoryTotal(categoryBreakdown, "subscriptions");
    if (subs / monthlyIncome > HIGH_SUBSCRIPTIONS_SHARE) {
      push(out, {
        kind: "high_subscriptions_share",
        priority: "low",
        payload: {
          share: round2((subs / monthlyIncome) * 100),
          amount: round2(subs),
        },
        // Subscriptions are typically optional — half is an honest
        // optimistic impact estimate for "audit and cut".
        monthlyImpact: round2(subs * 0.5),
        yearlyImpact: round2(subs * 0.5 * 12),
        action: "audit_subscriptions",
      });
    }
  }

  // 7) Top variable category — when one category dominates variable
  //    spending, it's the obvious place to start.
  if (expenseBuckets.variable > 0) {
    const topVariable = categoryBreakdown
      .filter((r) => r.transactions > 0)
      .slice(0, 1)[0];
    if (
      topVariable &&
      topVariable.total / expenseBuckets.variable > TOP_VARIABLE_CATEGORY_SHARE
    ) {
      push(out, {
        kind: "audit_top_variable_category",
        priority: "low",
        payload: {
          category: topVariable.category,
          amount: round2(topVariable.total),
          transactions: topVariable.transactions,
        },
        monthlyImpact: round2(topVariable.total * 0.2),
        yearlyImpact: round2(topVariable.total * 0.2 * 12),
        action: `reduce_${topVariable.category}`,
      });
    }
  }

  // 8) Dominant category — when ONE category takes more than half of
  //    total spending, it's the structural lever. Different from the
  //    "top variable" rule because dominant_category covers RECURRING
  //    too (e.g. housing 60 % of total → not a quick fix, but the
  //    coach needs to see it so it doesn't suggest cutting Netflix
  //    when the real problem is rent).
  if (expenseBuckets.total > 0) {
    const dominant = categoryBreakdown
      .slice(0, 1)
      .find((r) => r.total / expenseBuckets.total > DOMINANT_CATEGORY_SHARE);
    if (dominant) {
      // Priority depends on whether it's a housing-class fixed cost
      // (low priority — the user can't move next week) vs anything
      // else (medium priority — there's room to act).
      const isStructural = dominant.category === "housing";
      push(out, {
        kind: "dominant_category",
        priority: isStructural ? "low" : "medium",
        payload: {
          category: dominant.category,
          share: round2((dominant.total / expenseBuckets.total) * 100),
          amount: round2(dominant.total),
        },
        // Structural costs: no quick monthly impact to commit to.
        // Other categories: aim at a 10 % shave as an honest opener.
        monthlyImpact: isStructural ? 0 : round2(dominant.total * 0.1),
        yearlyImpact: isStructural ? 0 : round2(dominant.total * 0.1 * 12),
        action: isStructural
          ? "review_housing_costs"
          : `reduce_${dominant.category}`,
      });
    }
  }

  // 9) Low savings rate — < 5 % means the user is barely setting
  //    anything aside. The impact estimate is the amount needed to
  //    reach the 10 % "starter" target, not the 20 % healthy target,
  //    because going from 0 → 10 is a realistic next step.
  if (
    monthlyIncome > 0 &&
    typeof savingsRate === "number" &&
    Number.isFinite(savingsRate) &&
    savingsRate < LOW_SAVINGS_RATE
  ) {
    const targetRate = 0.1;
    const gap = Math.max(0, (targetRate - savingsRate) * monthlyIncome);
    push(out, {
      kind: "low_savings_rate",
      priority: savingsRate <= 0 ? "high" : "medium",
      payload: {
        rate: round2(savingsRate * 100),
        target: round2(targetRate * 100),
      },
      monthlyImpact: round2(gap),
      yearlyImpact: round2(gap * 12),
      action: "automate_savings_transfer",
    });
  }

  // Final ordering: high-priority first, then medium, then low.
  // Within the same priority bucket, higher monthly impact wins.
  return out
    .sort((a, b) => {
      const p = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (p !== 0) return p;
      return b.monthlyImpact - a.monthlyImpact;
    })
    .slice(0, MAX_OPPORTUNITIES);
}

function push(arr: Opportunity[], op: Opportunity) {
  arr.push(op);
}

function priorityWeight(p: OpportunityPriority): number {
  return p === "high" ? 3 : p === "medium" ? 2 : 1;
}

function findCategoryTotal(
  rows: readonly CategoryBreakdownRow[],
  category: string,
): number {
  return rows.find((r) => r.category === category)?.total ?? 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
