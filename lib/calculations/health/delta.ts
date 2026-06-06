import { AXIS_WEIGHTS } from "./constants";
import { roundInt } from "./utils";
import type {
  AxisId,
  AxisResult,
  DeltaContributor,
  DeltaExplanation,
  HealthScoreResult,
} from "./types";

/**
 * Phase 3.2 — Delta Explanation Engine.
 *
 * Transforms two consecutive HealthScoreResult into a human-readable
 * explanation of the move. The output drives the dashboard drawer's
 * "Pourquoi mon score a changé ?" block, but is also designed to be
 * consumed by Phase 3.5 (Notifications — reasonKey + payload are
 * already a notification body template), Phase 3.4 (Monthly Review
 * narrative), and Phase 3.3 (Timeline event annotations).
 *
 * SINGLE SOURCE OF TRUTH. Any phase that wants to say "Ton score a
 * monté de 3 parce que…" reads this. There is no parallel inference,
 * no LLM that recomputes the why.
 *
 * Determinism contract :
 *   - Same input → same output, byte-for-byte.
 *   - 1 to 5 contributors, ordered by |deltaPoints| desc.
 *   - At most ONE contributor per axis (no dedup needed by callers).
 *   - When no axis moved significantly, a single 'stable_period'
 *     contributor is returned (carrier = weakest axis).
 */

/* -------------------------------------------------------------------------- */
/*  Reason key catalogue — 20 keys + stable_period fallback                    */
/* -------------------------------------------------------------------------- */

export type ReasonKey =
  // Discipline (4)
  | "discipline_budget_streak_improved"
  | "discipline_budget_breach"
  | "discipline_savings_more_regular"
  | "discipline_savings_less_regular"
  // Résilience (4)
  | "resilience_runway_improved"
  | "resilience_runway_declined"
  | "resilience_savings_grew"
  | "resilience_burn_rose"
  // Trajectoire (2)
  | "trajectoire_savings_rate_improved"
  | "trajectoire_savings_rate_declined"
  // Couverture (3)
  | "couverture_area_added"
  | "couverture_area_removed"
  | "couverture_refined"
  // Objectifs (5)
  | "objectifs_goal_completed"
  | "objectifs_new_goal_set"
  | "objectifs_no_goals_anymore"
  | "objectifs_progress_made"
  | "objectifs_progress_stalled"
  // Comportement (2)
  | "comportement_more_active"
  | "comportement_less_active"
  // Fallback (1)
  | "stable_period";

/** Flat array for tests and i18n loaders to iterate over. */
export const REASON_KEYS: readonly ReasonKey[] = [
  "discipline_budget_streak_improved",
  "discipline_budget_breach",
  "discipline_savings_more_regular",
  "discipline_savings_less_regular",
  "resilience_runway_improved",
  "resilience_runway_declined",
  "resilience_savings_grew",
  "resilience_burn_rose",
  "trajectoire_savings_rate_improved",
  "trajectoire_savings_rate_declined",
  "couverture_area_added",
  "couverture_area_removed",
  "couverture_refined",
  "objectifs_goal_completed",
  "objectifs_new_goal_set",
  "objectifs_no_goals_anymore",
  "objectifs_progress_made",
  "objectifs_progress_stalled",
  "comportement_more_active",
  "comportement_less_active",
  "stable_period",
];

/* -------------------------------------------------------------------------- */
/*  Configuration                                                              */
/* -------------------------------------------------------------------------- */

/** Maximum number of contributors returned. Locked at 5 per design. */
export const MAX_CONTRIBUTORS = 5;

/**
 * Minimum |contribution| to surface an axis. Below this, the axis is
 * considered noise and the engine drops it from the contributors list.
 * 1 point of contribution corresponds to a ~1-point shift in the
 * final display score for that axis — anything finer is rounding.
 */
const MIN_AXIS_CONTRIBUTION = 1;

/**
 * Canonical axis order used as a tiebreaker when two contributors
 * have the same |deltaPoints|. Matches the calibration doc order
 * and the AXIS_ORDER constant of the persistence service.
 */
const AXIS_PRIORITY: readonly AxisId[] = [
  "discipline",
  "resilience",
  "trajectoire",
  "couverture",
  "objectifs",
  "comportement",
];

/* -------------------------------------------------------------------------- */
/*  Public entry point                                                         */
/* -------------------------------------------------------------------------- */

export interface ExplainDeltaInput {
  current: HealthScoreResult;
  previous: HealthScoreResult;
  fromWeek: string;
  toWeek: string;
}

export function explainDelta(input: ExplainDeltaInput): DeltaExplanation {
  const { current, previous, fromWeek, toWeek } = input;

  const netDelta = current.display - previous.display;

  // Compute renormalised weights at both ends so the per-axis
  // contribution math accounts for axes that came online or went
  // UNKNOWN since the previous snapshot.
  const wPrevious = renormalisedWeights(previous.axes);
  const wCurrent = renormalisedWeights(current.axes);

  const contributors: DeltaContributor[] = [];
  for (const id of AXIS_PRIORITY) {
    const prevAxis = previous.axes[id];
    const currAxis = current.axes[id];
    if (!prevAxis || !currAxis) continue;

    // Signed weighted contribution to the score. Even when an axis
    // crossed the UNKNOWN ↔ known boundary, the formula resolves
    // cleanly : the UNKNOWN side has weight 0, so the contribution
    // equals the known side's signed score × its weight.
    const contribution = roundInt(
      currAxis.score * wCurrent[id] - prevAxis.score * wPrevious[id],
    );
    if (Math.abs(contribution) < MIN_AXIS_CONTRIBUTION) continue;

    const reason = analyzeAxisChange(id, currAxis, prevAxis);
    contributors.push({
      axis: id,
      deltaPoints: contribution,
      reasonKey: reason.reasonKey,
      payload: reason.payload,
    });
  }

  // Sort by |deltaPoints| desc ; tiebreak by AXIS_PRIORITY index so
  // the ordering is byte-deterministic across reruns.
  contributors.sort((a, b) => {
    const absDiff = Math.abs(b.deltaPoints) - Math.abs(a.deltaPoints);
    if (absDiff !== 0) return absDiff;
    return AXIS_PRIORITY.indexOf(a.axis) - AXIS_PRIORITY.indexOf(b.axis);
  });

  // Take the top 5, then fallback to stable_period when nothing
  // meaningful moved.
  const top = contributors.slice(0, MAX_CONTRIBUTORS);
  if (top.length === 0) {
    top.push(stablePeriodContributor(current));
  }

  return {
    netDelta,
    contributors: top,
    fhsVersion: current.fhsVersion,
    fromWeek,
    toWeek,
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function renormalisedWeights(
  axes: Record<AxisId, AxisResult>,
): Record<AxisId, number> {
  let totalKnown = 0;
  for (const id of AXIS_PRIORITY) {
    if (axes[id]?.confidence !== "UNKNOWN") totalKnown += AXIS_WEIGHTS[id];
  }
  const out: Record<AxisId, number> = {
    discipline: 0,
    resilience: 0,
    trajectoire: 0,
    couverture: 0,
    objectifs: 0,
    comportement: 0,
  };
  if (totalKnown <= 0) return out;
  for (const id of AXIS_PRIORITY) {
    if (axes[id]?.confidence !== "UNKNOWN") {
      out[id] = AXIS_WEIGHTS[id] / totalKnown;
    }
  }
  return out;
}

function stablePeriodContributor(current: HealthScoreResult): DeltaContributor {
  // Pick the weakest known axis as the carrier — it's the most useful
  // anchor for the drawer ("nothing moved this week, but here's the
  // axis with the most room to grow").
  let weakest: AxisId = "discipline";
  let weakestScore = Number.POSITIVE_INFINITY;
  for (const id of AXIS_PRIORITY) {
    const a = current.axes[id];
    if (!a || a.confidence === "UNKNOWN") continue;
    if (a.score < weakestScore) {
      weakestScore = a.score;
      weakest = id;
    }
  }
  return {
    axis: weakest,
    deltaPoints: 0,
    reasonKey: "stable_period",
    payload: {},
  };
}

/* -------------------------------------------------------------------------- */
/*  Per-axis analyzers                                                         */
/* -------------------------------------------------------------------------- */

interface ReasonResult {
  reasonKey: ReasonKey;
  payload: Record<string, string | number>;
}

function analyzeAxisChange(
  id: AxisId,
  current: AxisResult,
  previous: AxisResult,
): ReasonResult {
  switch (id) {
    case "discipline":
      return analyzeDiscipline(current, previous);
    case "resilience":
      return analyzeResilience(current, previous);
    case "trajectoire":
      return analyzeTrajectoire(current, previous);
    case "couverture":
      return analyzeCouverture(current, previous);
    case "objectifs":
      return analyzeObjectifs(current, previous);
    case "comportement":
      return analyzeComportement(current, previous);
  }
}

/* ---------------------------- Discipline ---------------------------------- */

function analyzeDiscipline(c: AxisResult, p: AxisResult): ReasonResult {
  const dBudget = (num(c.components.budget_score) ?? 0)
    - (num(p.components.budget_score) ?? 0);
  const dSavings = (num(c.components.savings_consistency) ?? 0)
    - (num(p.components.savings_consistency) ?? 0);

  // Whichever sub-component swung the most carries the reason. Tie
  // → budget wins (weight 0.6 inside the axis).
  if (Math.abs(dBudget) >= Math.abs(dSavings)) {
    if (dBudget > 0) {
      return {
        reasonKey: "discipline_budget_streak_improved",
        payload: {
          successCount: num(c.components.budgets_success) ?? 0,
          total: num(c.components.budgets_total) ?? 0,
        },
      };
    }
    const failing =
      (num(c.components.budgets_total) ?? 0)
      - (num(c.components.budgets_success) ?? 0);
    return {
      reasonKey: "discipline_budget_breach",
      payload: { failingCount: failing },
    };
  }
  return {
    reasonKey:
      dSavings > 0
        ? "discipline_savings_more_regular"
        : "discipline_savings_less_regular",
    payload: {},
  };
}

/* ---------------------------- Résilience ---------------------------------- */

function analyzeResilience(c: AxisResult, p: AxisResult): ReasonResult {
  const runwayPrev = num(p.components.runway_months) ?? 0;
  const runwayCurr = num(c.components.runway_months) ?? 0;
  const dRunway = runwayCurr - runwayPrev;

  // 0.05 month is the minimum runway shift considered meaningful —
  // below that we look for sub-component story (savings vs burn).
  if (Math.abs(dRunway) >= 0.05) {
    return {
      reasonKey:
        dRunway > 0
          ? "resilience_runway_improved"
          : "resilience_runway_declined",
      payload: {
        from: round1(runwayPrev),
        to: round1(runwayCurr),
      },
    };
  }

  const savedDelta = (num(c.components.saved) ?? 0)
    - (num(p.components.saved) ?? 0);
  const burnDelta = (num(c.components.monthly_burn) ?? 0)
    - (num(p.components.monthly_burn) ?? 0);
  if (Math.abs(savedDelta) >= Math.abs(burnDelta) && savedDelta > 0) {
    return { reasonKey: "resilience_savings_grew", payload: {} };
  }
  if (burnDelta > 0) {
    return { reasonKey: "resilience_burn_rose", payload: {} };
  }
  // Default fallback : tiny runway move, present as a runway story
  // anyway so the drawer always has something to render.
  return {
    reasonKey:
      runwayCurr >= runwayPrev
        ? "resilience_runway_improved"
        : "resilience_runway_declined",
    payload: {
      from: round1(runwayPrev),
      to: round1(runwayCurr),
    },
  };
}

/* ---------------------------- Trajectoire --------------------------------- */

function analyzeTrajectoire(c: AxisResult, p: AxisResult): ReasonResult {
  const prevRate = num(p.components.savings_rate) ?? 0;
  const currRate = num(c.components.savings_rate) ?? 0;
  const direction = currRate >= prevRate;
  return {
    reasonKey: direction
      ? "trajectoire_savings_rate_improved"
      : "trajectoire_savings_rate_declined",
    payload: {
      fromPct: Math.round(prevRate * 100),
      toPct: Math.round(currRate * 100),
    },
  };
}

/* ---------------------------- Couverture ---------------------------------- */

function analyzeCouverture(c: AxisResult, p: AxisResult): ReasonResult {
  const prevFilled = strArr(p.details?.filled_majors);
  const currFilled = strArr(c.details?.filled_majors);

  const added = currFilled.filter((a) => !prevFilled.includes(a));
  const removed = prevFilled.filter((a) => !currFilled.includes(a));

  if (added.length > 0) {
    return {
      reasonKey: "couverture_area_added",
      payload: { area: added[0] },
    };
  }
  if (removed.length > 0) {
    return {
      reasonKey: "couverture_area_removed",
      payload: { area: removed[0] },
    };
  }
  return { reasonKey: "couverture_refined", payload: {} };
}

/* ---------------------------- Objectifs ----------------------------------- */

function analyzeObjectifs(c: AxisResult, p: AxisResult): ReasonResult {
  const prevEver = num(p.components.ever_completed) ?? 0;
  const currEver = num(c.components.ever_completed) ?? 0;
  if (currEver > prevEver) {
    return { reasonKey: "objectifs_goal_completed", payload: {} };
  }

  const prevActive = num(p.components.active_count) ?? 0;
  const currActive = num(c.components.active_count) ?? 0;
  if (currActive > prevActive) {
    return { reasonKey: "objectifs_new_goal_set", payload: {} };
  }
  if (currActive < prevActive && currActive === 0) {
    return { reasonKey: "objectifs_no_goals_anymore", payload: {} };
  }

  const prevAvg = num(p.components.avg_progress) ?? 0;
  const currAvg = num(c.components.avg_progress) ?? 0;
  if (currAvg > prevAvg) {
    return {
      reasonKey: "objectifs_progress_made",
      payload: { pct: Math.round(currAvg * 100) },
    };
  }
  return { reasonKey: "objectifs_progress_stalled", payload: {} };
}

/* ---------------------------- Comportement -------------------------------- */

function analyzeComportement(c: AxisResult, p: AxisResult): ReasonResult {
  const dEng = (num(c.components.engagement) ?? 0)
    - (num(p.components.engagement) ?? 0);
  return {
    reasonKey:
      dEng >= 0
        ? "comportement_more_active"
        : "comportement_less_active",
    payload: {},
  };
}

/* ---------------------------- tiny utils ---------------------------------- */

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
