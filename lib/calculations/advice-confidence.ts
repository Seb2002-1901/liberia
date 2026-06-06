import type { CompletenessResult } from "@/lib/calculations/completeness";

/**
 * Phase 3.1.10 — advice confidence score.
 *
 * The coach must adapt its language to how much it actually knows
 * about the user. A bold "tu peux économiser 200 CHF/mois" requires
 * a robust signal base; a tentative "je manque encore d'informations"
 * is the honest answer when the profile is thin.
 *
 * Pure derivation over the snapshot the dashboard already builds.
 * No I/O, no clock.
 *
 * Tiers (locked by tests):
 *   - HIGH   — structurelle >= 90 AND at least one budget defined
 *              AND the personality layer is reasonably filled
 *              (>= 3 dynamic memory entries OR static personality
 *              notes present)
 *   - LOW    — structurelle < 70 OR no memory at all of either kind
 *   - MEDIUM — everything in between
 *
 * The system prompt rule (see lib/ai/prompts.ts) instructs the coach
 * to phrase its conclusions accordingly: "je suis confiant" at HIGH,
 * "je peux te suggérer une piste" at MEDIUM, "je manque encore
 * d'informations pour être sûr" at LOW. The dashboard surfaces a
 * tiny chip beside the next-action card so the user understands the
 * label too.
 */

export type AdviceConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface AdviceConfidenceInput {
  completeness: CompletenessResult;
  /** True when at least one category budget exists. */
  hasBudgets: boolean;
  /** True when at least one goal is defined (DB or memory). */
  hasGoals: boolean;
  /** Count of non-archived dynamic memory entries. */
  memoryEntriesCount: number;
  /**
   * True when ANY of the static personality fields are populated:
   * financial_personality, progress_notes, preferred_motivation_style,
   * non-empty spending_triggers or recurring_challenges.
   */
  hasPersonalityNotes: boolean;
}

export interface AdviceConfidenceResult {
  level: AdviceConfidence;
  /**
   * Stable identifier of the dominant gap — used by the dashboard
   * chip + the coach prompt to phrase the explanation naturally:
   *   "structurelle" → finish the basics first
   *   "budgets"      → set a budget to anchor advice
   *   "memory"       → the coach barely knows you yet
   *   "none"         → all axes solid
   */
  weakest: "structurelle" | "budgets" | "memory" | "none";
}

export function computeAdviceConfidence(
  input: AdviceConfidenceInput,
): AdviceConfidenceResult {
  const {
    completeness,
    hasBudgets,
    hasGoals,
    memoryEntriesCount,
    hasPersonalityNotes,
  } = input;

  // Aggregate the memory-side signal.
  const richMemory = memoryEntriesCount >= 3 || hasPersonalityNotes;

  // LOW conditions first — never give a high-confidence answer when
  // the structural profile is fragile.
  if (completeness.structurelle < 70) {
    return { level: "LOW", weakest: "structurelle" };
  }
  // No memory at all of either kind: even with full structural data,
  // a coach pretending to know the user well is the wrong tone.
  if (memoryEntriesCount === 0 && !hasPersonalityNotes && !hasGoals) {
    return { level: "LOW", weakest: "memory" };
  }

  // HIGH conditions.
  if (completeness.structurelle >= 90 && hasBudgets && richMemory) {
    return { level: "HIGH", weakest: "none" };
  }

  // Otherwise MEDIUM — pick the most relevant gap.
  if (!hasBudgets) {
    return { level: "MEDIUM", weakest: "budgets" };
  }
  if (!richMemory) {
    return { level: "MEDIUM", weakest: "memory" };
  }
  if (completeness.structurelle < 90) {
    return { level: "MEDIUM", weakest: "structurelle" };
  }
  return { level: "MEDIUM", weakest: "none" };
}
