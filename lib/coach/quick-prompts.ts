/**
 * Quick-prompts surfaced on the empty coach state. Adapt to the user's
 * memory + behavior traits so the suggestions feel personal from the
 * first session, without revealing any tech detail.
 *
 * Pure function — picks a category key. Text content lives in
 * `messages/{locale}/app.json` under `app.coach.chat.suggestions.*`.
 * The caller passes a translator so the output renders in the user's
 * locale.
 */
import type { FinancialProfile, UserMemory } from "@/types/database";

export type QuickPromptCategory =
  | "default"
  | "cashflowNegative"
  | "noEmergencyFund"
  | "debtHeavy"
  | "anxious"
  | "impulsive"
  | "solidBase";

export type QuickPromptsInput = {
  financialProfile: FinancialProfile | null;
  memory: UserMemory | null;
  monthlyIncome: number;
  monthlyExpenses: number;
  hasEmergencyFund: boolean;
};

export type QuickPromptsTranslator = (
  category: QuickPromptCategory,
) => readonly string[];

/**
 * Selects the best-fit category for the user. Priority order:
 *   1. Cashflow negative (most urgent)
 *   2. Debt heavy (DTI ≥ 30%)
 *   3. Anxious trait (stress-first)
 *   4. Impulsive trait (habit-first)
 *   5. No emergency fund
 *   6. Solid base (savings-rate ≥ 15% & runway ≥ 3)
 *   7. Defaults
 */
export function pickQuickPromptCategory(
  input: QuickPromptsInput,
): QuickPromptCategory {
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

  if (cashflow < 0 && monthlyIncome > 0) return "cashflowNegative";
  if (dti >= 30 || challenges.has("debt_load")) return "debtHeavy";
  if (traits.has("anxious") || traits.has("avoidant")) return "anxious";
  if (traits.has("impulsive") || challenges.has("impulse_shopping")) return "impulsive";
  if (!hasEmergencyFund && monthlyIncome > 0) return "noEmergencyFund";
  if (savingsRate >= 0.15 && runway >= 3) return "solidBase";
  return "default";
}

/**
 * Resolves the 4 personalised prompts for the user via the supplied
 * translator. Convenience wrapper over `pickQuickPromptCategory`.
 */
export function deriveQuickPrompts(
  input: QuickPromptsInput,
  t: QuickPromptsTranslator,
): readonly string[] {
  return t(pickQuickPromptCategory(input));
}
