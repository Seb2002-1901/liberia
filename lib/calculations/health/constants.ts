import type { AxisId, Band } from "./types";

/**
 * Phase 3.2 — Financial Health Score constants.
 *
 * Every magic number lives here. Calibration changes in the next
 * 18 months go through this file, never inline. Bumping any of these
 * REQUIRES incrementing FHS_VERSION and writing a migration note.
 */

/**
 * Current formula version. Stored on every snapshot row so old
 * snapshots remain readable at their own semantics when the formula
 * evolves. Bumping rules :
 *   - patch (1.0.x) : copy / wording fixes, no math change
 *   - minor (1.x.0) : weight or threshold change ≤ 5 points
 *   - major (x.0.0) : axis added / removed, scale changed
 */
export const FHS_VERSION = "1.0.0";

/**
 * Nominal axis weights — validated as v1.0 of the calibration doc.
 * Sum to 1.0 exactly. Renormalisation happens AT RUNTIME when an axis
 * is INSUFFICIENT_DATA / UNKNOWN (see composition step).
 */
export const AXIS_WEIGHTS: Record<AxisId, number> = {
  discipline: 0.25,
  resilience: 0.25,
  trajectoire: 0.20,
  couverture: 0.15,
  objectifs: 0.10,
  comportement: 0.05,
};

/**
 * EMA factor on the smoothed score.
 *   smoothed_t = SMOOTHING_ALPHA * raw_t + (1 - SMOOTHING_ALPHA) * smoothed_{t-1}
 * 0.6 absorbs one-week shocks without masking real trends — a sustained
 * regression traverses the filter in ≈ 2 weeks.
 */
export const SMOOTHING_ALPHA = 0.6;

/**
 * Band thresholds, in ascending order.
 *   [0, 40)   → rose
 *   [40, 65)  → ambre
 *   [65, 85)  → or
 *   [85, 100] → emeraude
 */
export const BAND_THRESHOLDS = [40, 65, 85] as const;

export function bandFor(score: number): Band {
  if (score < BAND_THRESHOLDS[0]) return "rose";
  if (score < BAND_THRESHOLDS[1]) return "ambre";
  if (score < BAND_THRESHOLDS[2]) return "or";
  return "emeraude";
}

/**
 * Phase 3.2 — INSUFFICIENT_DATA short-circuit thresholds.
 *
 * If ANY of these conditions is true, the global confidence is forced
 * to INSUFFICIENT_DATA regardless of individual axis confidences. The
 * score is still computed and displayed, but UI says "Données
 * insuffisantes" and the coach refuses to draw conclusions.
 */
export const INSUFFICIENT_DATA_RULES = {
  /** Structural completeness below this → not enough profile depth. */
  MIN_STRUCTURELLE: 40,
  /** Number of major filled areas below this → not enough surface. */
  MIN_FILLED_MAJOR_AREAS: 2,
} as const;

/**
 * Axis-level confidence rollup thresholds (HIGH/MEDIUM/LOW only — the
 * INSUFFICIENT_DATA short-circuit applies BEFORE this rollup).
 */
export const CONFIDENCE_ROLLUP = {
  HIGH_MIN_HIGH_AXES: 5,
  MEDIUM_MIN_HIGH_AXES: 3,
} as const;

/**
 * Momentum thresholds. delta4Weeks is the change in display_score
 * across the 4-week window.
 */
export const MOMENTUM_RULES = {
  DIRECTION_FLAT_BAND: 2,   // |delta| < this → FLAT
  STRENGTH_WEAK_BAND: 3,    // |delta| < this → WEAK
  STRENGTH_STRONG_BAND: 8,  // |delta| ≥ this → STRONG (else MEDIUM)
  MIN_SNAPSHOTS: 2,         // below this → no momentum returned
  WINDOW_SIZE: 4,           // weeks looked back
} as const;

/**
 * Canonical actions used by the Recommendation Engine to simulate
 * "if you did X, your score would gain Y points". Each value is the
 * delta APPLIED to the source quantity, not the resulting state.
 */
export const RECOMMENDATION_ACTIONS = {
  /** +1 month of runway = current savings + 1 × fixed expenses. */
  RESILIENCE_TARGET_RUNWAY_GAIN_MONTHS: 1,
  /** +5 percentage points on the savings rate. */
  TRAJECTOIRE_TARGET_RATE_GAIN: 0.05,
  /** 1 additional budget respected. */
  DISCIPLINE_TARGET_BUDGET_GAIN: 1,
} as const;
