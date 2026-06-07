import type {
  AxisId,
  Band,
  DeltaContributor,
  DeltaExplanation,
  SealedSnapshot,
  TimelineEvent,
  TimelineResult,
} from "./types";

/**
 * Phase 3.3 — Timeline Engine.
 *
 * Pure function that turns the already-persisted snapshots + deltas
 * into a list of TimelineEvent the dashboard renders and the coach
 * cites. Strict consumer of existing Phase 3.2 data — never
 * recomputes the score, never duplicates the delta engine logic.
 *
 * Single source of truth :
 *   - health_snapshots  → score progression + band transitions +
 *                         axis state changes
 *   - health_score_deltas → reasoned contributors (already produced
 *                         by the delta engine, just mapped to events)
 *
 * No I/O. Caller fetches both tables and passes them in.
 */

export interface BuildTimelineInput {
  /**
   * Recent snapshots, ordered MOST-RECENT-FIRST. Caller decides the
   * window (12-16 is plenty — the timeline caps at maxEvents anyway).
   */
  snapshots: readonly SealedSnapshot[];
  /**
   * All deltas for those snapshots. Order doesn't matter — we index
   * by week_to.
   */
  deltas: readonly DeltaExplanation[];
  /** Max events emitted. Defaults to 10 per spec. */
  maxEvents?: number;
}

const DEFAULT_MAX_EVENTS = 10;

/**
 * Build the timeline. Events come out in most-recent-first order,
 * exactly as the UI renders them.
 *
 * Deterministic : same inputs → same output, byte-stable. Crucial so
 * the coach can cite the timeline without surprises across reruns.
 */
export function buildTimeline(input: BuildTimelineInput): TimelineResult {
  const maxEvents = input.maxEvents ?? DEFAULT_MAX_EVENTS;
  if (input.snapshots.length === 0) {
    return { events: [] };
  }

  // Index deltas by week_to for O(1) lookup.
  const deltasByWeek = new Map<string, DeltaExplanation>();
  for (const d of input.deltas) {
    deltasByWeek.set(d.toWeek, d);
  }

  const events: TimelineEvent[] = [];

  // Iterate snapshots most-recent-first. We append events in source
  // order per snapshot ; the final ordering keeps snapshot week ↓
  // and within-week emit order stable.
  for (const snap of input.snapshots) {
    const { week, result } = snap;
    const delta = deltasByWeek.get(week);

    // 1. Band transition — derived from the denormalised previous_band
    //    column. No comparison with the previous snapshot needed.
    if (result.previousBand && result.previousBand !== result.band) {
      events.push(bandChangedEvent(week, result.band, result.previousBand));
    }

    // 2. Score moves — derived from the delta's signed netDelta. We
    //    only emit when |netDelta| ≥ 1 ; below that the move is
    //    rounding noise.
    if (delta && Math.abs(delta.netDelta) >= 1) {
      events.push(scoreMoveEvent(week, delta.netDelta));
    }

    // 3. Per-contributor events — map specific delta reasonKeys to
    //    timeline event types. Several reasonKeys are silent in the
    //    timeline (they're internal to the score story but don't
    //    warrant a standalone timeline row, e.g. discipline_savings_*).
    if (delta) {
      for (const c of delta.contributors) {
        const ev = contributorToTimelineEvent(week, c);
        if (ev) events.push(ev);
      }
    }

    if (events.length >= maxEvents) break;
  }

  return { events: events.slice(0, maxEvents) };
}

/* -------------------------------------------------------------------------- */
/*  Event builders                                                             */
/* -------------------------------------------------------------------------- */

function scoreMoveEvent(week: string, netDelta: number): TimelineEvent {
  const up = netDelta > 0;
  return {
    week,
    type: up ? "score_up" : "score_down",
    titleKey: up ? "score_up" : "score_down",
    descriptionKey: up ? "score_up" : "score_down",
    impact: netDelta,
  };
}

function bandChangedEvent(
  week: string,
  to: Band,
  from: Band,
): TimelineEvent {
  // Suffix-based key per band so the UI selects the right copy
  // without needing a payload field (kept off the spec on purpose).
  // The from→to direction is encoded via "up" / "down" suffix so
  // the description tone matches (congrats vs reassurance).
  const direction = bandIndex(to) > bandIndex(from) ? "up" : "down";
  const key = `band_changed_to_${to}_${direction}`;
  return {
    week,
    type: "band_changed",
    titleKey: key,
    descriptionKey: key,
    impact: null,
  };
}

function contributorToTimelineEvent(
  week: string,
  c: DeltaContributor,
): TimelineEvent | null {
  switch (c.reasonKey) {
    case "resilience_runway_improved": {
      const from = typeof c.payload.from === "number" ? c.payload.from : null;
      const to = typeof c.payload.to === "number" ? c.payload.to : null;
      const impact = from !== null && to !== null ? round1(to - from) : null;
      return {
        week,
        type: "runway_improved",
        titleKey: "runway_improved",
        descriptionKey: "runway_improved",
        impact,
      };
    }
    case "couverture_area_added": {
      const area = typeof c.payload.area === "string" ? c.payload.area : null;
      if (!area) return null;
      // Suffix key per area : major_area_added_income,
      // major_area_added_housing, etc.
      return {
        week,
        type: "major_area_added",
        titleKey: `major_area_added_${area}`,
        descriptionKey: `major_area_added_${area}`,
        impact: null,
      };
    }
    case "objectifs_new_goal_set":
      return {
        week,
        type: "goal_created",
        titleKey: "goal_created",
        descriptionKey: "goal_created",
        impact: null,
      };
    case "objectifs_goal_completed":
      return {
        week,
        type: "goal_completed",
        titleKey: "goal_completed",
        descriptionKey: "goal_completed",
        impact: null,
      };
    // All other reasonKeys are intentionally silent in the timeline.
    // They drive the score story (visible in the drawer's "Why did
    // my score change?" block) but don't deserve a standalone row.
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function bandIndex(b: Band): number {
  return { rose: 0, ambre: 1, or: 2, emeraude: 3 }[b];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Axis-level helper kept around for the (J+1) "recommendation
 * followed" event we're not yet emitting. The full implementation
 * requires persisting past recommendations, deferred to Phase 3.4.
 * Exported as a type-only marker so the AxisId import stays alive
 * even when the helper isn't called yet.
 */
export type _RecommendationFollowedTargetAxis = AxisId;
