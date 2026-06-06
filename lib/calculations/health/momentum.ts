import { MOMENTUM_RULES } from "./constants";
import type { HealthScoreResult, MomentumResult } from "./types";

/**
 * Phase 3.2 — Momentum Engine.
 *
 * Transversal indicator that captures the direction of progression
 * across the most recent snapshots. Two users sitting on the same
 * display score (e.g. 68) have very different stories if one was at
 * 55 a month ago and the other at 70 — the score doesn't show that,
 * the momentum does.
 *
 * Hard rules :
 *   - NOT an axis. The score formula never reads momentum.
 *   - Pure function of past snapshots, ordered most-recent-first.
 *   - Returns null when fewer than MIN_SNAPSHOTS exist (no
 *     trajectory yet — the drawer renders nothing).
 *   - "Aucun bruit sur faibles variations" : |delta4Weeks| < 2 →
 *     direction FLAT. The user doesn't see a green arrow for a
 *     1-point wobble.
 *
 * Algorithm :
 *   windowSize  = min(snapshots.length, WINDOW_SIZE)
 *   delta       = snapshots[0].display - snapshots[windowSize - 1].display
 *   direction   = UP    if delta ≥ FLAT_BAND
 *                 DOWN  if delta ≤ -FLAT_BAND
 *                 FLAT  otherwise
 *   strength    = WEAK    if |delta| < WEAK_BAND
 *                 STRONG  if |delta| ≥ STRONG_BAND
 *                 MEDIUM  otherwise
 *
 * Consumed by : Drawer (chip "↗ progression solide"), coach context
 * (so the coach can say "ton score progresse calmement depuis 1 mois"),
 * Phase 3.3 Timeline events, Phase 3.5 Notifications.
 */
export function computeMomentum(
  snapshots: readonly HealthScoreResult[],
): MomentumResult | null {
  if (snapshots.length < MOMENTUM_RULES.MIN_SNAPSHOTS) {
    return null;
  }

  const windowSize = Math.min(snapshots.length, MOMENTUM_RULES.WINDOW_SIZE);
  const newest = snapshots[0];
  const oldest = snapshots[windowSize - 1];
  const delta = newest.display - oldest.display;
  const abs = Math.abs(delta);

  let direction: MomentumResult["direction"];
  if (abs < MOMENTUM_RULES.DIRECTION_FLAT_BAND) {
    direction = "FLAT";
  } else if (delta > 0) {
    direction = "UP";
  } else {
    direction = "DOWN";
  }

  let strength: MomentumResult["strength"];
  if (abs < MOMENTUM_RULES.STRENGTH_WEAK_BAND) {
    strength = "WEAK";
  } else if (abs >= MOMENTUM_RULES.STRENGTH_STRONG_BAND) {
    strength = "STRONG";
  } else {
    strength = "MEDIUM";
  }

  return {
    direction,
    strength,
    delta4Weeks: delta,
    windowSize,
  };
}
