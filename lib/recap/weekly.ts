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
  /** One short, premium-tone line celebrating something measurable. */
  victory: string;
  /** One short, premium-tone next priority line. */
  nextPriority: string;
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

function pickVictory(input: WeeklyRecapInput, activeDays: number, stepsDone: number): string {
  if (stepsDone >= 1) {
    return stepsDone === 1
      ? "Une étape de plan validée cette semaine — chaque palier compte."
      : `${stepsDone} étapes de plan validées cette semaine — belle régularité.`;
  }
  if (activeDays >= 5) {
    return "Présence régulière cette semaine — c'est ce qui fait la différence sur la durée.";
  }
  if (activeDays >= 3) {
    return "Plusieurs jours d'activité cette semaine — la cadence se construit.";
  }
  if (input.runway >= 3) {
    return "Ton fonds d'urgence reste solide. Continue à le préserver.";
  }
  if (input.savingsRate >= 0.15) {
    return "Ton taux d'épargne reste au-dessus de 15% — c'est rare et précieux.";
  }
  if (activeDays >= 1) {
    return "Tu es revenu·e cette semaine. La régularité prime sur l'intensité.";
  }
  return "Tu es là. C'est déjà un premier pas — on reprend tranquillement.";
}

function pickPriority(input: WeeklyRecapInput, hasActivePlan: boolean): string {
  if (input.cashflow < 0) {
    return "Identifie une seule dépense à réduire cette semaine — on commence par la plus simple.";
  }
  if (!input.hasEmergencyFund && input.cashflow > 0) {
    return "Programme un virement automatique vers un compte épargne séparé.";
  }
  if (hasActivePlan && input.runway < 3) {
    return "Continue ton plan — la prochaine étape est dans l'onglet Plan.";
  }
  if (input.savingsRate < 0.05) {
    return "Passe en revue tes abonnements actifs — c'est l'action avec le meilleur impact.";
  }
  if (input.runway >= 3 && input.savingsRate >= 0.15) {
    return "Choisis un objectif chiffré sur 12 mois et flèche-y une part de ton reste à vivre.";
  }
  return "Note 1 ou 2 dépenses cette semaine pour garder le réflexe de suivi.";
}

export function generateWeeklyRecap(input: WeeklyRecapInput): WeeklyRecap {
  const now = input.now ?? new Date();
  const { current, previous } = windowsFromNow(now);

  // Active days — set of YYYY-MM-DD across all create/update/completion
  // timestamps in the current 7-day window.
  const days = new Set<string>();
  let entriesThisWeek = 0;
  let entriesPreviousWeek = 0;

  const consider = (row: { created_at: string; updated_at?: string }) => {
    // Created in current window → counts as a new entry.
    if (inWindow(row.created_at, current)) {
      entriesThisWeek += 1;
      days.add(dateKey(row.created_at));
    } else if (inWindow(row.created_at, previous)) {
      entriesPreviousWeek += 1;
    }
    // Edits in current window count toward active days (not entries).
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

  // Plan step completions land on completed_at.
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
