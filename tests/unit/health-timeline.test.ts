import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/calculations/health/timeline";
import { FHS_VERSION } from "@/lib/calculations/health/constants";
import type {
  AxisId,
  AxisResult,
  Band,
  DeltaContributor,
  DeltaExplanation,
  HealthScoreResult,
  SealedSnapshot,
} from "@/lib/calculations/health/types";

/* -------------------------------------------------------------------------- */
/*  Builders                                                                   */
/* -------------------------------------------------------------------------- */

function axis(id: AxisId, score = 50): AxisResult {
  return { id, score, confidence: "HIGH", components: {} };
}

function snap(
  week: string,
  display: number,
  band: Band,
  previousBand: Band | null,
  previousScore: number | null = null,
): SealedSnapshot {
  const result: HealthScoreResult = {
    raw: display,
    smoothed: display,
    display,
    confidence: "HIGH",
    band,
    axes: {
      discipline: axis("discipline"),
      resilience: axis("resilience"),
      trajectoire: axis("trajectoire"),
      couverture: axis("couverture"),
      objectifs: axis("objectifs"),
      comportement: axis("comportement"),
    },
    previousScore,
    previousBand,
    fhsVersion: FHS_VERSION,
    computedAt: `2026-${week}T12:00:00Z`,
  };
  return { week, result };
}

function delta(
  weekTo: string,
  weekFrom: string,
  netDelta: number,
  contributors: DeltaContributor[] = [],
): DeltaExplanation {
  return {
    netDelta,
    contributors,
    fhsVersion: FHS_VERSION,
    fromWeek: weekFrom,
    toWeek: weekTo,
  };
}

/* -------------------------------------------------------------------------- */
/*  Degenerate inputs                                                          */
/* -------------------------------------------------------------------------- */

describe("buildTimeline — degenerate inputs", () => {
  it("returns empty events for 0 snapshots", () => {
    const r = buildTimeline({ snapshots: [], deltas: [] });
    expect(r.events).toEqual([]);
  });

  it("returns empty events for snapshots without any change (no delta, no band switch)", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 70, "or", "or", 70)],
      deltas: [],
    });
    expect(r.events).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/*  Score up / score down                                                      */
/* -------------------------------------------------------------------------- */

describe("buildTimeline — score moves", () => {
  it("emits score_up with positive impact when delta is positive", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 73, "or", "or", 70)],
      deltas: [delta("2026-W23", "2026-W22", 3)],
    });
    const score = r.events.find((e) => e.type === "score_up");
    expect(score).toBeDefined();
    expect(score?.impact).toBe(3);
    expect(score?.titleKey).toBe("score_up");
  });

  it("emits score_down with negative impact when delta is negative", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 67, "or", "or", 70)],
      deltas: [delta("2026-W23", "2026-W22", -3)],
    });
    const score = r.events.find((e) => e.type === "score_down");
    expect(score).toBeDefined();
    expect(score?.impact).toBe(-3);
  });

  it("skips score events when |netDelta| < 1 (rounding noise)", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 70, "or", "or", 70)],
      deltas: [delta("2026-W23", "2026-W22", 0)],
    });
    expect(r.events.find((e) => e.type === "score_up" || e.type === "score_down"))
      .toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/*  Band transitions                                                           */
/* -------------------------------------------------------------------------- */

describe("buildTimeline — band changed", () => {
  it("emits band_changed when previous_band differs from band (promotion)", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 70, "or", "ambre", 60)],
      deltas: [],
    });
    const band = r.events.find((e) => e.type === "band_changed");
    expect(band).toBeDefined();
    expect(band?.titleKey).toBe("band_changed_to_or_up");
  });

  it("emits band_changed with 'down' suffix on demotion", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 60, "ambre", "or", 67)],
      deltas: [],
    });
    const band = r.events.find((e) => e.type === "band_changed");
    expect(band?.titleKey).toBe("band_changed_to_ambre_down");
  });

  it("never emits band_changed when previous_band is null (first snapshot)", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 60, "ambre", null, null)],
      deltas: [],
    });
    expect(r.events.find((e) => e.type === "band_changed")).toBeUndefined();
  });

  it("never emits band_changed when band is unchanged", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 72, "or", "or", 68)],
      deltas: [delta("2026-W23", "2026-W22", 4)],
    });
    expect(r.events.find((e) => e.type === "band_changed")).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/*  Contributor-derived events                                                 */
/* -------------------------------------------------------------------------- */

describe("buildTimeline — runway_improved", () => {
  it("emits runway_improved with from→to delta as impact", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 73, "or", "or", 70)],
      deltas: [
        delta("2026-W23", "2026-W22", 3, [
          {
            axis: "resilience",
            deltaPoints: 3,
            reasonKey: "resilience_runway_improved",
            payload: { from: 2.7, to: 3.5 },
          },
        ]),
      ],
    });
    const ev = r.events.find((e) => e.type === "runway_improved");
    expect(ev).toBeDefined();
    expect(ev?.impact).toBeCloseTo(0.8, 1);
  });

  it("emits runway_improved with null impact when from/to missing", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 73, "or", "or", 70)],
      deltas: [
        delta("2026-W23", "2026-W22", 3, [
          {
            axis: "resilience",
            deltaPoints: 3,
            reasonKey: "resilience_runway_improved",
            payload: {},
          },
        ]),
      ],
    });
    const ev = r.events.find((e) => e.type === "runway_improved");
    expect(ev?.impact).toBeNull();
  });
});

describe("buildTimeline — major_area_added", () => {
  it("emits major_area_added with the suffix key matching the area", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 73, "or", "or", 70)],
      deltas: [
        delta("2026-W23", "2026-W22", 3, [
          {
            axis: "couverture",
            deltaPoints: 2,
            reasonKey: "couverture_area_added",
            payload: { area: "insurance" },
          },
        ]),
      ],
    });
    const ev = r.events.find((e) => e.type === "major_area_added");
    expect(ev?.titleKey).toBe("major_area_added_insurance");
  });

  it("skips major_area_added when area payload is missing", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 73, "or", "or", 70)],
      deltas: [
        delta("2026-W23", "2026-W22", 3, [
          {
            axis: "couverture",
            deltaPoints: 2,
            reasonKey: "couverture_area_added",
            payload: {},
          },
        ]),
      ],
    });
    expect(r.events.find((e) => e.type === "major_area_added")).toBeUndefined();
  });
});

describe("buildTimeline — goal events", () => {
  it("emits goal_created on objectifs_new_goal_set contributor", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 73, "or", "or", 70)],
      deltas: [
        delta("2026-W23", "2026-W22", 3, [
          {
            axis: "objectifs",
            deltaPoints: 5,
            reasonKey: "objectifs_new_goal_set",
            payload: {},
          },
        ]),
      ],
    });
    expect(r.events.find((e) => e.type === "goal_created")).toBeDefined();
  });

  it("emits goal_completed on objectifs_goal_completed contributor", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 73, "or", "or", 70)],
      deltas: [
        delta("2026-W23", "2026-W22", 3, [
          {
            axis: "objectifs",
            deltaPoints: 3,
            reasonKey: "objectifs_goal_completed",
            payload: {},
          },
        ]),
      ],
    });
    expect(r.events.find((e) => e.type === "goal_completed")).toBeDefined();
  });
});

/* -------------------------------------------------------------------------- */
/*  Silent contributors                                                        */
/* -------------------------------------------------------------------------- */

describe("buildTimeline — silent reasonKeys", () => {
  it("does NOT emit a timeline row for discipline_savings_more_regular", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 73, "or", "or", 70)],
      deltas: [
        delta("2026-W23", "2026-W22", 3, [
          {
            axis: "discipline",
            deltaPoints: 2,
            reasonKey: "discipline_savings_more_regular",
            payload: {},
          },
        ]),
      ],
    });
    // Only score_up should be present.
    const nonScore = r.events.filter(
      (e) => e.type !== "score_up" && e.type !== "score_down",
    );
    expect(nonScore).toEqual([]);
  });

  it("does NOT emit a row for stable_period", () => {
    const r = buildTimeline({
      snapshots: [snap("2026-W23", 70, "or", "or", 70)],
      deltas: [
        delta("2026-W23", "2026-W22", 0, [
          {
            axis: "discipline",
            deltaPoints: 0,
            reasonKey: "stable_period",
            payload: {},
          },
        ]),
      ],
    });
    expect(r.events).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/*  Ordering + cap                                                             */
/* -------------------------------------------------------------------------- */

describe("buildTimeline — ordering and cap", () => {
  it("preserves most-recent-first ordering from the snapshots input", () => {
    const r = buildTimeline({
      snapshots: [
        snap("2026-W23", 73, "or", "or", 70),
        snap("2026-W22", 70, "or", "ambre", 64),
      ],
      deltas: [
        delta("2026-W23", "2026-W22", 3),
        delta("2026-W22", "2026-W21", 6),
      ],
    });
    // Both weeks should appear, week 23 first.
    const weeks = r.events.map((e) => e.week);
    expect(weeks[0]).toBe("2026-W23");
    expect(weeks.indexOf("2026-W23")).toBeLessThan(weeks.indexOf("2026-W22"));
  });

  it("caps at maxEvents (default 10)", () => {
    // 6 snapshots each producing 2 events (score + band) = 12 candidates
    const snapshots: SealedSnapshot[] = [];
    const deltas: DeltaExplanation[] = [];
    for (let i = 0; i < 6; i++) {
      const w = `2026-W${(23 - i).toString().padStart(2, "0")}`;
      const wprev = `2026-W${(22 - i).toString().padStart(2, "0")}`;
      // Alternate band so each snapshot also fires a band_changed
      const band: Band = i % 2 === 0 ? "or" : "ambre";
      const prev: Band = i % 2 === 0 ? "ambre" : "or";
      snapshots.push(snap(w, 70, band, prev, 65));
      deltas.push(delta(w, wprev, 3));
    }
    const r = buildTimeline({ snapshots, deltas });
    expect(r.events.length).toBeLessThanOrEqual(10);
  });

  it("honours an explicit lower maxEvents", () => {
    const r = buildTimeline({
      snapshots: [
        snap("2026-W23", 73, "or", "or", 70),
        snap("2026-W22", 70, "or", "ambre", 64),
        snap("2026-W21", 64, "ambre", "rose", 38),
      ],
      deltas: [
        delta("2026-W23", "2026-W22", 3),
        delta("2026-W22", "2026-W21", 6),
        delta("2026-W21", "2026-W20", 26),
      ],
      maxEvents: 2,
    });
    expect(r.events.length).toBeLessThanOrEqual(2);
  });
});

/* -------------------------------------------------------------------------- */
/*  Determinism                                                                */
/* -------------------------------------------------------------------------- */

describe("buildTimeline — determinism", () => {
  it("same input → byte-identical output across reruns", () => {
    const snapshots = [
      snap("2026-W23", 73, "or", "ambre", 60),
    ];
    const deltas = [
      delta("2026-W23", "2026-W22", 13, [
        {
          axis: "resilience",
          deltaPoints: 4,
          reasonKey: "resilience_runway_improved",
          payload: { from: 2, to: 3 },
        },
        {
          axis: "couverture",
          deltaPoints: 3,
          reasonKey: "couverture_area_added",
          payload: { area: "income" },
        },
      ]),
    ];
    const a = buildTimeline({ snapshots, deltas });
    const b = buildTimeline({ snapshots, deltas });
    expect(a).toEqual(b);
  });
});
