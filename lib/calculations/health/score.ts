import {
  AXIS_WEIGHTS,
  bandFor,
  FHS_VERSION,
  SMOOTHING_ALPHA,
} from "./constants";
import {
  rollupGlobalConfidence,
  type InsufficientDataSignals,
} from "./confidence";
import { clamp, roundInt } from "./utils";
import type {
  AxisId,
  AxisResult,
  Band,
  HealthScoreResult,
} from "./types";

/**
 * Phase 3.2 — Health score composition.
 *
 * Glues the 6 axis calculators into a single 0-100 integer through
 * the exact 6-step pipeline of the calibration document :
 *
 *   1. Per-axis : compute a_i ∈ [0, 100] and c_i (done by caller).
 *   2. Renormalise weights : drop axes whose confidence is UNKNOWN,
 *      redistribute their share over the remaining known weights.
 *   3. raw = Σ a_i × w'_i for known i.
 *   4. EMA : smoothed = 0.6 × raw + 0.4 × previous_smoothed.
 *      First computation : smoothed = raw (no baseline).
 *   5. display = clamp(round(smoothed), 0, 100).
 *   6. confidence = rollupGlobalConfidence(…) including the
 *      INSUFFICIENT_DATA short-circuit.
 *
 * Pure, deterministic, injectable now → trivially testable. Every
 * caller (live dashboard, sealed snapshot writer, planning scenarios)
 * uses this same function to guarantee no semantic drift between
 * surfaces.
 */

export type { InsufficientDataSignals } from "./confidence";

export interface ComposeInput {
  /** Output of the 6 axis calculators, indexed by AxisId. */
  axes: Record<AxisId, AxisResult>;
  /** Smoothed score of the immediately previous SEALED snapshot. null
   *  on the very first computation (no historical baseline → no
   *  smoothing applied). */
  previousSmoothed: number | null;
  /** Display score of the immediately previous SEALED snapshot, mirrored
   *  onto this snapshot for Phase 3.3 Timeline. null on first. */
  previousDisplay: number | null;
  /** Band of the immediately previous SEALED snapshot. null on first. */
  previousBand: Band | null;
  /** Number of previously sealed snapshots — drives the
   *  INSUFFICIENT_DATA short-circuit. */
  previousSnapshotCount: number;
  /** Profile depth signals for INSUFFICIENT_DATA short-circuit. */
  signals: InsufficientDataSignals;
  /** Injectable wall-clock — used only for computedAt. */
  now: Date;
}

export function composeHealthScore(input: ComposeInput): HealthScoreResult {
  const {
    axes,
    previousSmoothed,
    previousDisplay,
    previousBand,
    previousSnapshotCount,
    signals,
    now,
  } = input;

  // -------- Steps 2 & 3 : renormalisation + weighted sum --------
  const knownAxisIds = (Object.keys(axes) as AxisId[]).filter(
    (id) => axes[id].confidence !== "UNKNOWN",
  );
  const totalKnownWeight = knownAxisIds.reduce(
    (sum, id) => sum + AXIS_WEIGHTS[id],
    0,
  );

  let raw: number;
  if (totalKnownWeight <= 0) {
    // All axes UNKNOWN — degenerate (essentially empty profile). Score
    // is 0 but the global confidence will be INSUFFICIENT_DATA so the
    // UI treats it as provisional, not as a "bad grade".
    raw = 0;
  } else {
    const weightedSum = knownAxisIds.reduce((sum, id) => {
      const renorm = AXIS_WEIGHTS[id] / totalKnownWeight;
      return sum + axes[id].score * renorm;
    }, 0);
    raw = clamp(roundInt(weightedSum), 0, 100);
  }

  // -------- Step 4 : EMA smoothing --------
  let smoothed: number;
  if (previousSmoothed === null) {
    smoothed = raw;
  } else {
    smoothed = clamp(
      roundInt(SMOOTHING_ALPHA * raw + (1 - SMOOTHING_ALPHA) * previousSmoothed),
      0,
      100,
    );
  }

  // -------- Step 5 : display --------
  // smoothed is already an integer in [0,100] — this clamp/round is
  // a defensive no-op but keeps the pipeline explicit.
  const display = clamp(roundInt(smoothed), 0, 100);

  // -------- Step 6 : band + confidence rollup --------
  const band = bandFor(display);
  const confidence = rollupGlobalConfidence({
    axes,
    signals,
    previousSnapshotCount,
  });

  return {
    raw,
    smoothed,
    display,
    confidence,
    band,
    axes,
    previousScore: previousDisplay,
    previousBand,
    fhsVersion: FHS_VERSION,
    computedAt: now.toISOString(),
  };
}
