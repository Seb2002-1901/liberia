import { frequencyMultiplier } from "@/lib/calculations/aggregate";
import { normalizeToMonthly } from "@/lib/calculations/finance";
import {
  computeFinancialCompleteness,
  type CompletenessResult,
  type FinancialArea,
} from "@/lib/calculations/completeness";
import {
  computeBudgetProgress,
  type BudgetProgress,
} from "@/lib/calculations/budget-goals";
import type { ComportementInput } from "./axes/comportement";
import type { CouvertureInput } from "./axes/couverture";
import type { DisciplineInput } from "./axes/discipline";
import type { ObjectifsInput } from "./axes/objectifs";
import type { ResilienceInput } from "./axes/resilience";
import type { TrajectoireInput } from "./axes/trajectoire";
import type { InsufficientDataSignals } from "./confidence";
import type { FinanceData } from "@/lib/services/finance";

/**
 * Phase 3.2 — pure aggregator that turns the existing FinanceData
 * (already loaded by the dashboard route) plus a small bundle of
 * extra signals (engagement counters, account age, optional income
 * history) into the 6 axis inputs + the global INSUFFICIENT_DATA
 * signals.
 *
 * Keeps the writer service trivial : the writer just does I/O for
 * the extras, calls this aggregator, then runs the 6 calculators
 * and the composition. No imperative glue between FinanceData and
 * the score formula lives anywhere else.
 *
 * 100 % pure : no I/O, no clock, no random. Easy to unit-test on
 * mock finance fixtures.
 */

/**
 * Major structural areas matching completeness V2. Drives the
 * Couverture axis's filled_majors / missing_majors arrays so the
 * delta engine can say "Logement renseigné" precisely.
 */
const MAJOR_AREAS: readonly FinancialArea[] = [
  "income",
  "housing",
  "insurance",
  "food",
  "transport",
];

/**
 * Signals the writer pulls from outside the FinanceData payload —
 * mostly counters and account metadata that aren't part of the
 * finance model proper.
 */
export interface ExtraSignals {
  /**
   * Variable expenses logged in the last 30 days (already
   * deduplicated by the gathering service to defend against gaming).
   */
  txCount30d: number;
  /** Coach messages from the user in the last 30 days (≥ 5 words). */
  coachMsg30d: number;
  /** Memory entries the coach has created in the last 30 days. */
  memoryEntries30d: number;
  /** Days since the account was created. */
  accountAgeDays: number;
  /**
   * 3-month rolling average of monthly income. null when fewer than
   * 3 months of data exist — then current month income is used.
   */
  history3mIncomeAvg: number | null;
  /** Months of income history observed (0-3). */
  incomeHistoryMonths: number;
  /**
   * Monthly savings rates of the last 1-3 months (oldest first). Used
   * by Discipline's savings_consistency sub-component. Pass an empty
   * array when no history is available.
   */
  savingsRatesByMonth: readonly number[];
}

/**
 * Bundle returned by the aggregator — fed in one shot to the
 * composition layer.
 */
export interface AxisInputBundle {
  discipline: DisciplineInput;
  resilience: ResilienceInput;
  trajectoire: TrajectoireInput;
  couverture: CouvertureInput;
  objectifs: ObjectifsInput;
  comportement: ComportementInput;
  signals: InsufficientDataSignals;
  /**
   * Side-results the aggregator already had to compute. Returned so
   * the writer can avoid recomputing them for the delta engine or
   * for upstream callers (dashboard cards, coach context).
   */
  completeness: CompletenessResult;
  budgetProgress: readonly BudgetProgress[];
}

export interface BuildAxisInputsParams {
  financeData: FinanceData;
  extras: ExtraSignals;
}

export function buildAxisInputs(p: BuildAxisInputsParams): AxisInputBundle {
  const { financeData, extras } = p;

  /* ---- shared derivations ------------------------------------------------ */

  const monthlyIncome = sumMonthlyIncome(financeData.incomes)
    || financeData.financialProfile?.monthly_income
    || 0;
  const monthlyExpensesFixed = financeData.expenseBuckets.fixed
    || financeData.financialProfile?.monthly_expenses
    || 0;
  const exploitableExpenses = financeData.expenseBuckets.total;
  const currentSavings = financeData.financialProfile?.current_savings ?? null;

  // Distinct categories among RECURRING expense lines. Drives the
  // Resilience axis confidence (HIGH ≥ 3 categories).
  const fixedCategoryIds = new Set<string>();
  for (const e of financeData.expenses) {
    if (e.frequency !== "one_time") fixedCategoryIds.add(e.category);
  }
  const fixedExpensesCategoryCount = fixedCategoryIds.size;

  // Completeness V2 — Couverture axis + INSUFFICIENT_DATA signal.
  const completeness = computeFinancialCompleteness({
    incomes: financeData.incomes,
    expenses: financeData.expenses,
    goals: financeData.goals,
    categoryBudgets: financeData.categoryBudgets,
  });

  const detectedSet = new Set<string>(completeness.detected);
  const filledMajorAreas = MAJOR_AREAS.filter((a) => detectedSet.has(a));
  const missingMajorAreas = MAJOR_AREAS.filter((a) => !detectedSet.has(a));

  // Budget progress — Discipline axis input.
  const budgetProgress = computeBudgetProgress(
    financeData.categoryBudgets.map((b) => ({
      category: b.category,
      monthly_limit: b.monthly_limit,
    })),
    financeData.expenses,
  );

  /* ---- axis inputs ------------------------------------------------------- */

  const discipline: DisciplineInput = {
    budgets: budgetProgress.map((p) => ({
      status: p.status,
      percentage: p.percentage,
    })),
    savingsRatesByMonth: extras.savingsRatesByMonth,
  };

  const resilience: ResilienceInput = {
    currentSavings,
    monthlyExpensesFixed,
    fixedExpensesCategoryCount,
  };

  const trajectoire: TrajectoireInput = {
    monthlyIncome,
    monthlyExpensesFixed,
    history3mIncomeAvg: extras.history3mIncomeAvg,
    incomeHistoryMonths: extras.incomeHistoryMonths,
  };

  const couverture: CouvertureInput = {
    structurelle: completeness.structurelle,
    filledMajorAreas,
    missingMajorAreas,
  };

  const activeGoals = financeData.goals
    .filter((g) => !g.is_completed)
    .map((g) => ({
      target_amount: g.target_amount,
      current_amount: g.current_amount,
    }));
  const completedGoalsCount = financeData.goals.filter(
    (g) => g.is_completed,
  ).length;
  const profileHasActivity =
    monthlyIncome > 0 || financeData.expenseBuckets.total > 0;

  const objectifs: ObjectifsInput = {
    activeGoals,
    completedGoalsCount,
    profileHasActivity,
  };

  const comportement: ComportementInput = {
    txCount30d: extras.txCount30d,
    coachMsg30d: extras.coachMsg30d,
    memoryEntries30d: extras.memoryEntries30d,
    accountAgeDays: extras.accountAgeDays,
  };

  /* ---- INSUFFICIENT_DATA signals ---------------------------------------- */

  const signals: InsufficientDataSignals = {
    structurelle: completeness.structurelle,
    monthlyIncome,
    exploitableExpenses,
    filledMajorAreasCount: filledMajorAreas.length,
  };

  return {
    discipline,
    resilience,
    trajectoire,
    couverture,
    objectifs,
    comportement,
    signals,
    completeness,
    budgetProgress,
  };
}

/* -------------------------------------------------------------------------- */
/*  Tiny helpers                                                               */
/* -------------------------------------------------------------------------- */

function sumMonthlyIncome(
  incomes: FinanceData["incomes"],
): number {
  return incomes.reduce(
    (sum, i) => sum + normalizeToMonthly(i.amount, frequencyMultiplier(i.frequency)),
    0,
  );
}
