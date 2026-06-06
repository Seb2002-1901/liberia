/**
 * Phase 3.2 — Financial Health Score
 *
 * Canonical types shared by every layer of the FHS pipeline :
 *   - Layer 1 axis calculators write AxisResult
 *   - Layer 2 composition produces HealthScoreResult
 *   - Layer 3 persistence stores both verbatim
 *   - Layer 4 delta engine consumes two HealthScoreResult to produce
 *     DeltaExplanation
 *   - Layer 7 UI receives a single DrawerData composite
 *
 * Design invariants — never break across versions :
 *   1. The 4 confidence tiers are exhaustive : HIGH / MEDIUM / LOW /
 *      INSUFFICIENT_DATA. The fourth tier is not "very low" — it is
 *      the "we will not pretend to interpret yet" state.
 *   2. AxisId is a closed union of 6 strings. Adding a seventh axis
 *      requires bumping fhsVersion and writing a migration column.
 *   3. AxisResult.components is a flat number record so the delta
 *      engine can diff field-by-field deterministically.
 *   4. HealthScoreResult.previousScore / previousBand are denormalised
 *      onto every snapshot so Timeline (Phase 3.3) reads transitions
 *      with a WHERE clause, not a window function.
 */

export type AxisId =
  | "discipline"
  | "resilience"
  | "trajectoire"
  | "couverture"
  | "objectifs"
  | "comportement";

/**
 * Phase 3.2 — Two confidence vocabularies, distinct on purpose :
 *
 * AxisConfidence (per-axis output) — used by the composition step
 * to decide whether an axis participates in the weighted sum :
 *   - HIGH    : axis has solid input, contributes at full weight
 *   - MEDIUM  : axis has partial input, still contributes
 *   - LOW     : axis has thin input, still contributes
 *   - UNKNOWN : axis cannot be computed at all, EXCLUDED from the
 *               weighted sum (the renormaliser redistributes its
 *               weight across the remaining axes)
 *
 * Confidence (global, on the final score) — surfaced to the UI and
 * to the coach :
 *   - HIGH    : majority of axes are HIGH, score is a real read
 *   - MEDIUM  : enough HIGH axes for the synthesis to hold up
 *   - LOW     : few axes confident, score has caveats
 *   - INSUFFICIENT_DATA : short-circuit BEFORE the rollup. Triggered
 *                         when the user profile is too thin for the
 *                         score to mean anything (no income, < 40 %
 *                         structurelle, no historical snapshot, …).
 *                         UI says "Données insuffisantes" (neutral) ;
 *                         coach refuses conclusions and asks instead.
 */
export type AxisConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";

export type Band = "rose" | "ambre" | "or" | "emeraude";

/**
 * Result of one axis calculator. Pure, deterministic, lossless :
 * components carry every sub-quantity the delta engine needs to
 * diagnose a change without re-reading source data.
 */
export interface AxisResult {
  id: AxisId;
  /** 0-100 integer, post-clamp. */
  score: number;
  confidence: AxisConfidence;
  /**
   * Flat record of NUMERIC sub-component values. Shape is axis-specific
   * but STABLE across versions for a given axis. The delta engine
   * reads these to attribute each axis change to a precise reason via
   * straight numeric diffs.
   */
  components: Record<string, number>;
  /**
   * Optional non-numeric details the delta engine needs to produce a
   * specific reason. Example : Couverture stores filled_majors as an
   * array of area ids so the engine can set-diff and report "Logement
   * renseigné" rather than the generic "Profil affiné". Stored as
   * jsonb alongside components — no schema change required to add
   * new entries.
   */
  details?: Record<string, string | string[]>;
}

/**
 * Result of one full FHS computation. Lives in two places :
 *   - in memory at every dashboard load (the "live" calculation)
 *   - in health_snapshots rows (the "sealed" weekly snapshot)
 *
 * Both share the same shape — same code path on both ends.
 */
export interface HealthScoreResult {
  /** Weighted sum of axis scores BEFORE smoothing. Stored for audit. */
  raw: number;
  /** Post-EMA (60/40) score. Canonical for the system. */
  smoothed: number;
  /** Clamped, rounded, what the user sees in the ring. */
  display: number;
  confidence: Confidence;
  band: Band;
  axes: Record<AxisId, AxisResult>;

  // Timeline-ready denormalisation. Mirrors the SQL columns of
  // health_snapshots so the DB row maps 1-1 to this object.
  previousScore: number | null;
  previousBand: Band | null;

  fhsVersion: string;
  /** ISO timestamp of the computation. */
  computedAt: string;
}

/**
 * Phase 3.2 — Momentum Engine.
 *
 * Transversal indicator computed FROM snapshots, NOT injected into
 * score calculation. Two users at 68 with different trajectories
 * (flat vs climbing) get different momentum reads — that's the point.
 *
 * Returns null when fewer than 2 snapshots exist (no trajectory yet).
 */
export interface MomentumResult {
  direction: "UP" | "DOWN" | "FLAT";
  strength: "WEAK" | "MEDIUM" | "STRONG";
  /** display_score(now) - display_score(oldest_in_4w_window). */
  delta4Weeks: number;
  /** How many snapshots were available in the 4-week window (2-4). */
  windowSize: number;
}

/**
 * Phase 3.2 — Delta Explanation Engine.
 *
 * Materialised on every snapshot write. Drives the drawer block
 * "Pourquoi mon score a changé ?". Always between 1 and 5
 * contributors, sorted by absolute deltaPoints desc.
 */
export interface DeltaContributor {
  axis: AxisId;
  /** Signed contribution to the final score (entier). */
  deltaPoints: number;
  /** Stable i18n key. See lib/calculations/health/delta.ts catalogue. */
  reasonKey: string;
  payload: Record<string, string | number>;
}

export interface DeltaExplanation {
  /** display(current) - display(previous). */
  netDelta: number;
  contributors: DeltaContributor[];
  fhsVersion: string;
  fromWeek: string;
  toWeek: string;
}

/**
 * Phase 3.2 — AI Recommendation Engine.
 *
 * Single source of truth for "what should the user do next ?" derived
 * purely from the score state. Consumed by drawer, coach, notifications
 * (Phase 3.5), Monthly Review (Phase 3.4). Never duplicated.
 *
 * Always targets ONE axis — the weakest confident axis. estimatedGain
 * is computed by simulating a canonical action on that axis and
 * recomputing the score. null when the gain cannot be cleanly
 * simulated (e.g. comportement axis).
 */
export interface HealthRecommendation {
  targetAxis: AxisId;
  titleKey: string;
  descriptionKey: string;
  payload: Record<string, string | number>;
  /** Integer points the score would gain if the recommended action lands. */
  estimatedGain: number | null;
}

/**
 * Composite object consumed by the dashboard drawer. The drawer
 * receives ONE input, not four — guarantees no inconsistency between
 * what the ring shows, what the drawer explains and what the coach
 * cites in chat.
 */
export interface DrawerData {
  score: HealthScoreResult;
  delta: DeltaExplanation | null;
  momentum: MomentumResult | null;
  recommendation: HealthRecommendation | null;
}
