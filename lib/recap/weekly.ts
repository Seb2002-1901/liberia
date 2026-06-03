/**
 * Weekly recap generator — pure function over already-loaded user data.
 * No external calls, no LLM, no new tables. Computes activity metrics
 * from existing rows (created_at, updated_at, completed_at) so the
 * dashboard can surface a calm "you're progressing" summary, even
 * before Anthropic is wired up.
 *
 * Design rules:
 *  - never invent metrics — only what's measurable from real rows
 *  - never judge ("you should") — observe and offer ("we noticed", "next")
 *  - one small victory line + one small priority line per recap
 *  - mobile-first: keep field count low and labels short
 *
 * Locale: the helper returns translation KEYS + params for the victory
 * and nextPriority lines. WeeklyRecapCard resolves them through
 * `dashboard.weeklyRecap.{victories,priorities}.*` in the user's locale.
 */
import type { Expense, FinancialPlanStep, Goal, Income } from "@/types/database";

export type WeeklyRecapInput = {
  incomes: Income[];
  expenses: Expense[];
  goals: Goal[];
  planSteps: FinancialPlanStep[];
  /** Snapshot values for victory/priority selection. */
  cashflow: number;
  runway: number;
  savingsRate: number;
  stabilityScore: number;
  hasEmergencyFund: boolean;
  /** Optional clock override for deterministic tests. */
  now?: Date;
};

export type RecapLineDescriptor = {
  /** Translation key under `dashboard.weeklyRecap.victories|priorities.*`. */
  key: string;
  params: Record<string, string | number>;
};

export type WeeklyRecap = {
  /** Distinct days with at least one create/update/completion this week. */
  activeDays: number;
  /** Income + expense + goal additions in the current 7-day window. */
  entriesThisWeek: number;
  /** Same count for the previous 7-day window (for delta context). */
  entriesPreviousWeek: number;
  /** Plan steps completed in the current 7-day window. */
  stepsCompletedThisWeek: number;
  /** Plan steps still open across the active plan (if any). */
  stepsRemaining: number;
  /** Descriptor for the victory line — caller translates. */
  victory: RecapLineDescriptor;
  /** Descriptor for the next-priority line — caller translates. */
  nextPriority: RecapLineDescriptor;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function windowsFromNow(now: Date): { current: [Date, Date]; previous: [Date, Date] } {
  const end = now;
  const curStart = new Date(end.getTime() - 7 * MS_PER_DAY);
  const prevStart = new Date(curStart.getTime() - 7 * MS_PER_DAY);
  return { current: [curStart, end], previous: [prevStart, curStart] };
}

function inWindow(iso: string | null | undefined, win: [Date, Date]): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= win[0].getTime() && t < win[1].getTime();
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function pickVictory(
  input: WeeklyRecapInput,
  activeDays: number,
  stepsDone: number,
): RecapLineDescriptor {
  if (stepsDone >= 1) {
    return stepsDone === 1
      ? { key: "victories.stepOne", params: {} }
      : { key: "victories.stepsMany", params: { count: stepsDone } };
  }
  if (activeDays >= 5) return { key: "victories.activeFive", params: {} };
  if (activeDays >= 3) return { key: "victories.activeThree", params: {} };
  if (input.runway >= 3) return { key: "victories.runwaySolid", params: {} };
  if (input.savingsRate >= 0.15) return { key: "victories.savingsRateHigh", params: {} };
  if (activeDays >= 1) return { key: "victories.activeOne", params: {} };
  return { key: "victories.presence", params: {} };
}

function pickPriority(
  input: WeeklyRecapInput,
  hasActivePlan: boolean,
): RecapLineDescriptor {
  if (input.cashflow < 0) return { key: "priorities.cashflowNegative", params: {} };
  if (!input.hasEmergencyFund && input.cashflow > 0)
    return { key: "priorities.noEmergency", params: {} };
  if (hasActivePlan && input.runway < 3)
    return { key: "priorities.planContinue", params: {} };
  if (input.savingsRate < 0.05) return { key: "priorities.subscriptions", params: {} };
  if (input.runway >= 3 && input.savingsRate >= 0.15)
    return { key: "priorities.twelveMonthGoal", params: {} };
  return { key: "priorities.trackingHabit", params: {} };
}

export function generateWeeklyRecap(input: WeeklyRecapInput): WeeklyRecap {
  const now = input.now ?? new Date();
  const { current, previous } = windowsFromNow(now);

  const days = new Set<string>();
  let entriesThisWeek = 0;
  let entriesPreviousWeek = 0;

  const consider = (row: { created_at: string; updated_at?: string }) => {
    if (inWindow(row.created_at, current)) {
      entriesThisWeek += 1;
      days.add(dateKey(row.created_at));
    } else if (inWindow(row.created_at, previous)) {
      entriesPreviousWeek += 1;
    }
    if (
      row.updated_at &&
      row.updated_at !== row.created_at &&
      inWindow(row.updated_at, current)
    ) {
      days.add(dateKey(row.updated_at));
    }
  };

  for (const r of input.incomes) consider(r);
  for (const r of input.expenses) consider(r);
  for (const r of input.goals) consider(r);

  let stepsCompletedThisWeek = 0;
  for (const s of input.planSteps) {
    if (s.is_completed && inWindow(s.completed_at, current)) {
      stepsCompletedThisWeek += 1;
      if (s.completed_at) days.add(dateKey(s.completed_at));
    }
  }

  const stepsRemaining = input.planSteps.filter((s) => !s.is_completed).length;
  const hasActivePlan = input.planSteps.length > 0;

  return {
    activeDays: days.size,
    entriesThisWeek,
    entriesPreviousWeek,
    stepsCompletedThisWeek,
    stepsRemaining,
    victory: pickVictory(input, days.size, stepsCompletedThisWeek),
    nextPriority: pickPriority(input, hasActivePlan),
  };
}
