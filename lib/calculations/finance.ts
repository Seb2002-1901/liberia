import { clamp, safeNumber } from "@/lib/utils";

export type CashflowInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
};

export function calculateNetCashflow({
  monthlyIncome,
  monthlyExpenses,
}: CashflowInput): number {
  return safeNumber(monthlyIncome) - safeNumber(monthlyExpenses);
}

export function calculateSavingsRate({
  monthlyIncome,
  monthlyExpenses,
}: CashflowInput): number {
  const income = safeNumber(monthlyIncome);
  if (income <= 0) return 0;
  const net = income - safeNumber(monthlyExpenses);
  return clamp((net / income) * 100, -100, 100);
}

export function calculateExpenseRatio({
  monthlyIncome,
  monthlyExpenses,
}: CashflowInput): number {
  const income = safeNumber(monthlyIncome);
  if (income <= 0) return 100;
  return clamp((safeNumber(monthlyExpenses) / income) * 100, 0, 999);
}

export type RunwayInput = {
  currentSavings: number;
  monthlyExpenses: number;
};

/** How many months current savings can cover expenses. */
export function calculateRunway({
  currentSavings,
  monthlyExpenses,
}: RunwayInput): number {
  const expenses = safeNumber(monthlyExpenses);
  if (expenses <= 0) return Infinity;
  return Math.max(0, safeNumber(currentSavings) / expenses);
}

export type StabilityInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  hasEmergencyFund: boolean;
  debtToIncomeRatio?: number;
};

/**
 * Score de stabilité financière sur 100.
 * Pondération transparente:
 *  - taux d'épargne (35)
 *  - runway / fonds d'urgence (30)
 *  - ratio dépenses (20)
 *  - ratio dettes (15)
 */
export function calculateStabilityScore(input: StabilityInput): number {
  const savingsRate = calculateSavingsRate(input);
  const runway = calculateRunway({
    currentSavings: input.currentSavings,
    monthlyExpenses: input.monthlyExpenses,
  });
  const expenseRatio = calculateExpenseRatio(input);
  const dti = clamp(safeNumber(input.debtToIncomeRatio, 0), 0, 100);

  // Savings rate component (35): 0% → 0, 25%+ → max
  const savingsScore = clamp((savingsRate / 25) * 35, 0, 35);

  // Runway component (30): 0 mois → 0, 6 mois → max
  const finiteRunway = Number.isFinite(runway) ? runway : 12;
  const runwayScore = clamp((finiteRunway / 6) * 30, 0, 30);
  const emergencyBonus = input.hasEmergencyFund ? 2 : 0;

  // Expense ratio (20): 100%+ → 0, 60%- → max
  const expenseScore = clamp(
    ((100 - clamp(expenseRatio, 0, 100)) / 40) * 20,
    0,
    20,
  );

  // DTI (15): 0% → max, 40%+ → 0
  const dtiScore = clamp(((40 - dti) / 40) * 15, 0, 15);

  const total = savingsScore + runwayScore + emergencyBonus + expenseScore + dtiScore;
  return clamp(Math.round(total), 0, 100);
}

export type StressInput = {
  perceivedStress: number; // 1..5
  expenseRatio: number;
  runwayMonths: number;
  cashflow: number;
};

/** Niveau de stress financier estimé, 0..100. */
export function calculateFinancialStress({
  perceivedStress,
  expenseRatio,
  runwayMonths,
  cashflow,
}: StressInput): number {
  const perceived = clamp((safeNumber(perceivedStress, 3) - 1) / 4, 0, 1) * 40;
  const ratioComp = clamp(expenseRatio / 120, 0, 1) * 25;
  const runwayComp = clamp(1 - Math.min(runwayMonths, 6) / 6, 0, 1) * 25;
  const cashflowComp = cashflow < 0 ? 10 : 0;
  return clamp(Math.round(perceived + ratioComp + runwayComp + cashflowComp), 0, 100);
}

export type ScoreTierColor =
  | "danger"
  | "warning"
  | "neutral"
  | "success"
  | "gold";

/**
 * Stability tier — pure mapping `score → bucket`. Labels and
 * descriptions are translated at render time via
 * `dashboard.stability.tiers.<color>.{label,description}` so the same
 * function can power UI in any locale without forking.
 */
export function getStabilityTier(score: number): { color: ScoreTierColor } {
  if (score >= 80) return { color: "gold" };
  if (score >= 60) return { color: "success" };
  if (score >= 40) return { color: "neutral" };
  if (score >= 20) return { color: "warning" };
  return { color: "danger" };
}

export function normalizeToMonthly(
  amount: number,
  frequencyMultiplier: number,
): number {
  return safeNumber(amount) * safeNumber(frequencyMultiplier);
}
