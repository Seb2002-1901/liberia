/**
 * Proactive coach — derive at most one short, calm hint to surface on
 * the dashboard. Pure function over already-loaded data; never makes
 * an LLM call. Used to give a sense of continuity ("the coach noticed")
 * without becoming spammy or anxiogenic.
 *
 * Hierarchy (only the first match is returned):
 *   1. long_inactive — no activity for 7+ days
 *   2. goal_close — an active goal is ≥ 80% funded
 *   3. tight_month — cashflow currently negative
 *   4. solid_progress — runway ≥ 3 mo + savings rate ≥ 15%
 *   5. emergency_gap — no fund + cashflow ≥ 0
 *
 * If nothing meaningful applies, returns null and the card is hidden —
 * silence is better than fake encouragement.
 */
import { resolveCoachingTone } from "@/lib/coach/tone";
import { formatCurrency } from "@/lib/utils";
import type {
  CoachingTone,
  Expense,
  FinancialPlanStep,
  Goal,
  Income,
  UserMemory,
} from "@/types/database";

export type ProactiveInput = {
  incomes: Income[];
  expenses: Expense[];
  goals: Goal[];
  planSteps: FinancialPlanStep[];
  cashflow: number;
  runway: number;
  savingsRate: number;
  hasEmergencyFund: boolean;
  monthlyExpenses: number;
  currency?: string;
  behaviorTraits?: readonly string[];
  coachingTone?: CoachingTone | null;
  memory?: UserMemory | null;
  /** Optional clock override for deterministic tests. */
  now?: Date;
};

export type ProactiveKind =
  | "long_inactive"
  | "goal_close"
  | "tight_month"
  | "solid_progress"
  | "emergency_gap";

export type ProactiveHint = {
  kind: ProactiveKind;
  /** 1 short sentence — what the coach noticed. */
  headline: string;
  /** Optional 1-line context. */
  body?: string;
  /** Suggested CTA. */
  action: { label: string; href: string };
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function maxIsoDate(rows: { created_at: string; updated_at?: string }[]): number {
  let max = -Infinity;
  for (const r of rows) {
    const c = new Date(r.created_at).getTime();
    if (Number.isFinite(c) && c > max) max = c;
    if (r.updated_at) {
      const u = new Date(r.updated_at).getTime();
      if (Number.isFinite(u) && u > max) max = u;
    }
  }
  return max;
}

function lastActivityMs(input: ProactiveInput): number {
  return Math.max(
    maxIsoDate(input.incomes),
    maxIsoDate(input.expenses),
    maxIsoDate(input.goals),
    Math.max(
      -Infinity,
      ...input.planSteps
        .map((s) => (s.completed_at ? new Date(s.completed_at).getTime() : -Infinity))
        .filter((t) => Number.isFinite(t)),
    ),
  );
}

export function generateProactiveHint(input: ProactiveInput): ProactiveHint | null {
  const now = (input.now ?? new Date()).getTime();
  const tone = resolveCoachingTone(input.coachingTone ?? null, input.behaviorTraits ?? []);
  const fmt = (n: number) => formatCurrency(n, input.currency ?? "CHF");

  // 1. Long inactive — no activity in the last 7 days. Requires the
  // user to have at least some data (otherwise it's just a new account).
  const last = lastActivityMs(input);
  const hasAnyData =
    input.incomes.length + input.expenses.length + input.goals.length > 0;
  if (hasAnyData && Number.isFinite(last) && now - last > 7 * MS_PER_DAY) {
    return {
      kind: "long_inactive",
      headline:
        tone === "direct"
          ? "Ça fait quelques jours — on fait le point ?"
          : tone === "structured"
            ? "Quelques jours sans suivi — on reprend tranquillement."
            : "On ne s'est pas vu·s depuis quelques jours. On reprend en douceur ?",
      action: { label: "Faire le point avec le coach", href: "/coach" },
    };
  }

  // 2. Goal close — first active goal at ≥ 80% completion.
  const closeGoal = input.goals.find(
    (g) =>
      !g.is_completed &&
      g.target_amount > 0 &&
      g.current_amount / g.target_amount >= 0.8 &&
      g.current_amount / g.target_amount < 1,
  );
  if (closeGoal) {
    const pct = Math.round((closeGoal.current_amount / closeGoal.target_amount) * 100);
    return {
      kind: "goal_close",
      headline: `Ton objectif « ${closeGoal.title} » est à ${pct}%.`,
      body: `Plus que ${fmt(closeGoal.target_amount - closeGoal.current_amount)} pour le boucler.`,
      action: { label: "Voir mes objectifs", href: "/goals" },
    };
  }

  // 3. Tight month — cashflow currently negative.
  if (input.cashflow < 0 && input.expenses.length > 0) {
    const gap = Math.abs(input.cashflow);
    return {
      kind: "tight_month",
      headline:
        tone === "direct"
          ? `Tes dépenses dépassent tes revenus d'environ ${fmt(gap)}/mois.`
          : `Mois un peu tendu — environ ${fmt(gap)} de plus que tes revenus.`,
      body:
        tone === "gentle"
          ? "Pas de panique. Une dépense à la fois suffit."
          : "On peut s'attaquer à un poste à la fois, sans pression.",
      action: { label: "Parler au coach", href: "/coach" },
    };
  }

  // 4. Solid progress — runway ≥ 3 mo and savings rate ≥ 15%.
  if (input.runway >= 3 && input.savingsRate >= 0.15) {
    return {
      kind: "solid_progress",
      headline: "Tu avances dans la bonne direction.",
      body: `Runway de ${input.runway.toFixed(1)} mois et taux d'épargne au-dessus de 15%.`,
      action: { label: "Définir un objectif 12 mois", href: "/goals" },
    };
  }

  // 5. Emergency gap — no fund yet but cashflow positive (actionable).
  if (!input.hasEmergencyFund && input.cashflow > 0 && input.monthlyExpenses > 0) {
    return {
      kind: "emergency_gap",
      headline: "Tu n'as pas encore de fonds d'urgence dédié.",
      body: "Démarrer petit suffit — l'important c'est l'automatisation.",
      action: { label: "Voir mon plan", href: "/plan" },
    };
  }

  return null;
}
