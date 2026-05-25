/**
 * Quick-prompts surfaced on the empty coach state. Adapt to the user's
 * memory + behavior traits so the suggestions feel personal from the
 * first session, without revealing any tech detail.
 *
 * Pure function — no side effects, no fetch.
 */
import type { FinancialProfile, UserMemory } from "@/types/database";

export type QuickPromptsInput = {
  financialProfile: FinancialProfile | null;
  memory: UserMemory | null;
  monthlyIncome: number;
  monthlyExpenses: number;
  hasEmergencyFund: boolean;
};

const DEFAULTS: readonly string[] = [
  "Que dois-je faire cette semaine ?",
  "Comment réduire mon stress financier ?",
  "Quelle dépense dois-je surveiller ?",
  "Aide-moi à tenir mon plan.",
];

const CASHFLOW_NEGATIVE: readonly string[] = [
  "Comment réduire mon écart mensuel ?",
  "Quelle est la dépense la plus simple à couper ?",
  "Par où commencer pour souffler un peu ?",
  "Comment retrouver de la marge ce mois-ci ?",
];

const NO_EMERGENCY_FUND: readonly string[] = [
  "Comment construire un fonds d'urgence à mon rythme ?",
  "Quel montant viser pour commencer ?",
  "Comment automatiser mon épargne ?",
  "Par où commencer pour me sécuriser ?",
];

const DEBT_HEAVY: readonly string[] = [
  "Par quel crédit dois-je commencer à rembourser ?",
  "Comment alléger ma charge de dette ?",
  "Comment prioriser entre rembourser et épargner ?",
  "Comment renégocier un crédit ?",
];

const ANXIOUS: readonly string[] = [
  "Comment baisser mon stress financier ?",
  "Une seule action à faire aujourd'hui ?",
  "Comment retrouver de la sérénité côté argent ?",
  "Aide-moi à avancer sans pression.",
];

const IMPULSIVE: readonly string[] = [
  "Comment limiter les achats impulsifs ?",
  "Comment plafonner mes dépenses variables ?",
  "Comment identifier mes déclencheurs de dépense ?",
  "Comment construire une habitude qui tient ?",
];

const SOLID_BASE: readonly string[] = [
  "Comment accélérer mon épargne ?",
  "Quels objectifs viser sur 12 mois ?",
  "Comment faire travailler mon épargne ?",
  "Comment optimiser mes assurances et contrats ?",
];

/**
 * Returns 4 personalized prompts. Priority order:
 *   1. Cashflow negative (most urgent)
 *   2. Debt heavy (DTI ≥ 30%)
 *   3. Anxious trait (stress-first)
 *   4. Impulsive trait (habit-first)
 *   5. No emergency fund
 *   6. Solid base (savings-rate ≥ 15% & runway ≥ 3)
 *   7. Defaults
 */
export function deriveQuickPrompts(input: QuickPromptsInput): readonly string[] {
  const { financialProfile, memory, monthlyIncome, monthlyExpenses, hasEmergencyFund } = input;
  const cashflow = monthlyIncome - monthlyExpenses;
  const runway = monthlyExpenses > 0 ? (financialProfile?.current_savings ?? 0) / monthlyExpenses : Infinity;
  const savingsRate = monthlyIncome > 0 ? cashflow / monthlyIncome : 0;
  const dti =
    monthlyIncome > 0
      ? ((financialProfile?.monthly_debt ?? 0) / monthlyIncome) * 100
      : 0;
  const traits = new Set(financialProfile?.behavior_traits ?? []);
  const challenges = new Set(memory?.recurring_challenges ?? []);

  if (cashflow < 0 && monthlyIncome > 0) return CASHFLOW_NEGATIVE;
  if (dti >= 30 || challenges.has("debt_load")) return DEBT_HEAVY;
  if (traits.has("anxious") || traits.has("avoidant")) return ANXIOUS;
  if (traits.has("impulsive") || challenges.has("impulse_shopping")) return IMPULSIVE;
  if (!hasEmergencyFund && monthlyIncome > 0) return NO_EMERGENCY_FUND;
  if (savingsRate >= 0.15 && runway >= 3) return SOLID_BASE;
  return DEFAULTS;
}
