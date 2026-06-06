import {
  CONFIDENCE_ROLLUP,
  INSUFFICIENT_DATA_RULES,
} from "./constants";
import type {
  AxisId,
  AxisResult,
  Confidence,
} from "./types";

/**
 * Phase 3.2 — Global confidence rollup with INSUFFICIENT_DATA short-circuit.
 *
 * Two-stage logic, in order :
 *   1. Profile depth check (isInsufficientData). If ANY of the 5
 *      structural conditions fails, the global confidence is
 *      INSUFFICIENT_DATA regardless of individual axis confidences.
 *      The UI then says "Données insuffisantes" (neutral, not
 *      accusatory) and the coach refuses any conclusion.
 *   2. Otherwise, count HIGH-confidence axes :
 *        ≥ 5 HIGH → HIGH
 *        ≥ 3 HIGH → MEDIUM
 *        else    → LOW
 */

/**
 * Profile depth signals fed to the INSUFFICIENT_DATA short-circuit.
 * Every consumer (live composition, sealed snapshot, coach context)
 * computes these the same way — duplicating the rule would invite
 * drift, so they live behind isInsufficientData() exclusively.
 */
export interface InsufficientDataSignals {
  /** completeness.structurelle 0-100, single source. */
  structurelle: number;
  /** Sum of declared monthly incomes (post-normalisation to monthly). */
  monthlyIncome: number;
  /**
   * Sum of expenses the analysis can actually USE — fixed (recurring
   * normalised monthly) + variable (this month's transactions). 0 = the
   * user has declared no expense data we can work with.
   */
  exploitableExpenses: number;
  /** Number of MAJOR areas filled — matches the Couverture axis input. */
  filledMajorAreasCount: number;
}

export function isInsufficientData(input: {
  signals: InsufficientDataSignals;
  /** Number of previously sealed snapshots for this user. 0 = the
   *  current computation is the very first — no historical reference
   *  yet, so the read is provisional by definition. */
  previousSnapshotCount: number;
}): boolean {
  const { signals, previousSnapshotCount } = input;

  if (signals.structurelle < INSUFFICIENT_DATA_RULES.MIN_STRUCTURELLE) {
    return true;
  }
  if (signals.monthlyIncome <= 0) return true;
  if (signals.exploitableExpenses <= 0) return true;
  if (
    signals.filledMajorAreasCount < INSUFFICIENT_DATA_RULES.MIN_FILLED_MAJOR_AREAS
  ) {
    return true;
  }
  if (previousSnapshotCount <= 0) return true;

  return false;
}

export function rollupGlobalConfidence(input: {
  axes: Record<AxisId, AxisResult>;
  signals: InsufficientDataSignals;
  previousSnapshotCount: number;
}): Confidence {
  if (isInsufficientData(input)) return "INSUFFICIENT_DATA";

  let highCount = 0;
  for (const id of Object.keys(input.axes) as AxisId[]) {
    if (input.axes[id].confidence === "HIGH") highCount++;
  }

  if (highCount >= CONFIDENCE_ROLLUP.HIGH_MIN_HIGH_AXES) return "HIGH";
  if (highCount >= CONFIDENCE_ROLLUP.MEDIUM_MIN_HIGH_AXES) return "MEDIUM";
  return "LOW";
}
