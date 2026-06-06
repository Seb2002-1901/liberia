import { describe, expect, it } from "vitest";
import { composeHealthScore } from "@/lib/calculations/health/score";
import type { InsufficientDataSignals } from "@/lib/calculations/health/confidence";
import type { AxisId, AxisResult } from "@/lib/calculations/health/types";
import { AXIS_WEIGHTS } from "@/lib/calculations/health/constants";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const NOW = new Date("2026-06-08T12:00:00Z");

function axis(
  id: AxisId,
  score: number,
  confidence: AxisResult["confidence"] = "HIGH",
): AxisResult {
  return { id, score, confidence, components: {} };
}

function healthySignals(): InsufficientDataSignals {
  return {
    structurelle: 80,
    monthlyIncome: 4500,
    exploitableExpenses: 3600,
    filledMajorAreasCount: 4,
  };
}

function profileBAxes(): Record<AxisId, AxisResult> {
  // From the calibration doc — Profile B (cadre supérieur stable).
  return {
    discipline: axis("discipline", 72),
    resilience: axis("resilience", 78),
    trajectoire: axis("trajectoire", 100),
    couverture: axis("couverture", 95),
    objectifs: axis("objectifs", 61),
    comportement: axis("comportement", 72),
  };
}

/* -------------------------------------------------------------------------- */
/*  Renormalisation                                                            */
/* -------------------------------------------------------------------------- */

describe("composeHealthScore — renormalisation", () => {
  it("uses nominal weights when every axis is known", () => {
    const r = composeHealthScore({
      axes: profileBAxes(),
      previousSmoothed: null,
      previousDisplay: null,
      previousBand: null,
      previousSnapshotCount: 1,
      signals: healthySignals(),
      now: NOW,
    });
    // Manual weighted sum :
    //   72×0.25 + 78×0.25 + 100×0.20 + 95×0.15 + 61×0.10 + 72×0.05
    //   = 18 + 19.5 + 20 + 14.25 + 6.1 + 3.6 = 81.45 → 81
    expect(r.raw).toBe(81);
  });

  it("redistributes weights when an axis is UNKNOWN", () => {
    const axes = profileBAxes();
    axes.comportement = axis("comportement", 30, "UNKNOWN");
    const r = composeHealthScore({
      axes,
      previousSmoothed: null,
      previousDisplay: null,
      previousBand: null,
      previousSnapshotCount: 1,
      signals: healthySignals(),
      now: NOW,
    });
    // Without comportement : total known weight = 0.95
    //   72×(0.25/0.95) + 78×(0.25/0.95) + 100×(0.20/0.95) + 95×(0.15/0.95) + 61×(0.10/0.95)
    //   ≈ 18.95 + 20.53 + 21.05 + 15.00 + 6.42 = 81.95 → 82
    expect(r.raw).toBe(82);
  });

  it("returns raw 0 when EVERY axis is UNKNOWN", () => {
    const axes = profileBAxes();
    for (const id of Object.keys(axes) as AxisId[]) {
      axes[id] = { ...axes[id], confidence: "UNKNOWN" };
    }
    const r = composeHealthScore({
      axes,
      previousSmoothed: null,
      previousDisplay: null,
      previousBand: null,
      previousSnapshotCount: 0,
      signals: { structurelle: 0, monthlyIncome: 0, exploitableExpenses: 0, filledMajorAreasCount: 0 },
      now: NOW,
    });
    expect(r.raw).toBe(0);
    expect(r.display).toBe(0);
    expect(r.confidence).toBe("INSUFFICIENT_DATA");
  });

  it("sums to 100 when every axis is at 100 (no rounding drift)", () => {
    const axes: Record<AxisId, AxisResult> = {
      discipline: axis("discipline", 100),
      resilience: axis("resilience", 100),
      trajectoire: axis("trajectoire", 100),
      couverture: axis("couverture", 100),
      objectifs: axis("objectifs", 100),
      comportement: axis("comportement", 100),
    };
    const r = composeHealthScore({
      axes,
      previousSmoothed: null,
      previousDisplay: null,
      previousBand: null,
      previousSnapshotCount: 1,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.raw).toBe(100);
  });

  it("AXIS_WEIGHTS sum to exactly 1.0 (sanity)", () => {
    const sum = Object.values(AXIS_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });
});

/* -------------------------------------------------------------------------- */
/*  Lissage                                                                    */
/* -------------------------------------------------------------------------- */

describe("composeHealthScore — lissage (EMA 60/40)", () => {
  it("first snapshot : smoothed === raw (no baseline)", () => {
    const r = composeHealthScore({
      axes: profileBAxes(),
      previousSmoothed: null,
      previousDisplay: null,
      previousBand: null,
      previousSnapshotCount: 1,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.smoothed).toBe(r.raw);
  });

  it("absorbs a downward shock per the 60/40 formula", () => {
    // raw 60, previous 80 → smoothed = round(0.6 × 60 + 0.4 × 80) = 68
    const axes: Record<AxisId, AxisResult> = {
      discipline: axis("discipline", 60),
      resilience: axis("resilience", 60),
      trajectoire: axis("trajectoire", 60),
      couverture: axis("couverture", 60),
      objectifs: axis("objectifs", 60),
      comportement: axis("comportement", 60),
    };
    const r = composeHealthScore({
      axes,
      previousSmoothed: 80,
      previousDisplay: 80,
      previousBand: "or",
      previousSnapshotCount: 5,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.raw).toBe(60);
    expect(r.smoothed).toBe(68);
  });

  it("absorbs an upward shock per the 60/40 formula", () => {
    // raw 100, previous 50 → smoothed = round(0.6 × 100 + 0.4 × 50) = 80
    const axes: Record<AxisId, AxisResult> = {
      discipline: axis("discipline", 100),
      resilience: axis("resilience", 100),
      trajectoire: axis("trajectoire", 100),
      couverture: axis("couverture", 100),
      objectifs: axis("objectifs", 100),
      comportement: axis("comportement", 100),
    };
    const r = composeHealthScore({
      axes,
      previousSmoothed: 50,
      previousDisplay: 50,
      previousBand: "ambre",
      previousSnapshotCount: 5,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.raw).toBe(100);
    expect(r.smoothed).toBe(80);
  });

  it("a sustained regression traverses the filter over several weeks", () => {
    // Simulate raw stuck at 60 with previous 80.
    // Week 1 : smoothed = 0.6 × 60 + 0.4 × 80 = 68
    // Week 2 : smoothed = 0.6 × 60 + 0.4 × 68 = 63 (round of 63.2)
    // Week 3 : smoothed = 0.6 × 60 + 0.4 × 63 = 61
    let prev = 80;
    for (const expected of [68, 63, 61]) {
      const axes: Record<AxisId, AxisResult> = {
        discipline: axis("discipline", 60),
        resilience: axis("resilience", 60),
        trajectoire: axis("trajectoire", 60),
        couverture: axis("couverture", 60),
        objectifs: axis("objectifs", 60),
        comportement: axis("comportement", 60),
      };
      const r = composeHealthScore({
        axes,
        previousSmoothed: prev,
        previousDisplay: prev,
        previousBand: "or",
        previousSnapshotCount: 5,
        signals: healthySignals(),
        now: NOW,
      });
      expect(r.smoothed).toBe(expected);
      prev = r.smoothed;
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  Bands and clamp                                                            */
/* -------------------------------------------------------------------------- */

describe("composeHealthScore — bands", () => {
  function withScore(s: number) {
    const a: Record<AxisId, AxisResult> = {
      discipline: axis("discipline", s),
      resilience: axis("resilience", s),
      trajectoire: axis("trajectoire", s),
      couverture: axis("couverture", s),
      objectifs: axis("objectifs", s),
      comportement: axis("comportement", s),
    };
    return composeHealthScore({
      axes: a,
      previousSmoothed: null,
      previousDisplay: null,
      previousBand: null,
      previousSnapshotCount: 1,
      signals: healthySignals(),
      now: NOW,
    });
  }

  it("score 39 → rose, 40 → ambre (boundary)", () => {
    expect(withScore(39).band).toBe("rose");
    expect(withScore(40).band).toBe("ambre");
  });

  it("score 64 → ambre, 65 → or (boundary)", () => {
    expect(withScore(64).band).toBe("ambre");
    expect(withScore(65).band).toBe("or");
  });

  it("score 84 → or, 85 → emeraude (boundary)", () => {
    expect(withScore(84).band).toBe("or");
    expect(withScore(85).band).toBe("emeraude");
  });

  it("score 0 → rose, score 100 → emeraude (extrema)", () => {
    expect(withScore(0).band).toBe("rose");
    expect(withScore(100).band).toBe("emeraude");
  });
});

/* -------------------------------------------------------------------------- */
/*  Previous fields mirroring (Timeline-ready)                                 */
/* -------------------------------------------------------------------------- */

describe("composeHealthScore — previous fields", () => {
  it("mirrors previousDisplay and previousBand verbatim", () => {
    const r = composeHealthScore({
      axes: profileBAxes(),
      previousSmoothed: 65,
      previousDisplay: 65,
      previousBand: "or",
      previousSnapshotCount: 3,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.previousScore).toBe(65);
    expect(r.previousBand).toBe("or");
  });

  it("nulls them on the very first computation", () => {
    const r = composeHealthScore({
      axes: profileBAxes(),
      previousSmoothed: null,
      previousDisplay: null,
      previousBand: null,
      previousSnapshotCount: 0,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.previousScore).toBeNull();
    expect(r.previousBand).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/*  INSUFFICIENT_DATA short-circuit                                            */
/* -------------------------------------------------------------------------- */

describe("composeHealthScore — INSUFFICIENT_DATA short-circuit", () => {
  it("first snapshot is INSUFFICIENT_DATA even with full HIGH axes", () => {
    const r = composeHealthScore({
      axes: profileBAxes(),
      previousSmoothed: null,
      previousDisplay: null,
      previousBand: null,
      previousSnapshotCount: 0,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.confidence).toBe("INSUFFICIENT_DATA");
    // Score is STILL computed and displayed — provisional, not hidden.
    expect(r.display).toBe(81);
    expect(r.band).toBe("or");
  });

  it("becomes MEDIUM/HIGH from the second computation onwards", () => {
    const r = composeHealthScore({
      axes: profileBAxes(),
      previousSmoothed: 81,
      previousDisplay: 81,
      previousBand: "or",
      previousSnapshotCount: 1,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.confidence).not.toBe("INSUFFICIENT_DATA");
  });

  it("structurelle < 40 keeps the score INSUFFICIENT_DATA forever", () => {
    const r = composeHealthScore({
      axes: profileBAxes(),
      previousSmoothed: 70,
      previousDisplay: 70,
      previousBand: "or",
      previousSnapshotCount: 12,
      signals: { ...healthySignals(), structurelle: 30 },
      now: NOW,
    });
    expect(r.confidence).toBe("INSUFFICIENT_DATA");
  });
});

/* -------------------------------------------------------------------------- */
/*  Profile-level integration sanity                                           */
/* -------------------------------------------------------------------------- */

describe("composeHealthScore — calibration profiles", () => {
  it("Profile B yields raw ≈ 80 (calibration doc reference)", () => {
    const r = composeHealthScore({
      axes: profileBAxes(),
      previousSmoothed: 78,
      previousDisplay: 78,
      previousBand: "or",
      previousSnapshotCount: 4,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.raw).toBeGreaterThanOrEqual(78);
    expect(r.raw).toBeLessThanOrEqual(82);
    expect(r.band).toBe("or");
  });

  it("Profile H (couple in difficulty) yields raw in the rose band", () => {
    const axes: Record<AxisId, AxisResult> = {
      discipline: axis("discipline", 20),
      resilience: axis("resilience", 6),
      trajectoire: axis("trajectoire", 0),
      couverture: axis("couverture", 88),
      objectifs: axis("objectifs", 0, "LOW"),
      comportement: axis("comportement", 64),
    };
    const r = composeHealthScore({
      axes,
      previousSmoothed: 20,
      previousDisplay: 20,
      previousBand: "rose",
      previousSnapshotCount: 6,
      signals: healthySignals(),
      now: NOW,
    });
    // Calibration mentions S_raw ≈ 18 ; exact formula sum is
    //   20×0.25 + 6×0.25 + 0×0.20 + 88×0.15 + 0×0.10 + 64×0.05
    //   = 5 + 1.5 + 0 + 13.2 + 0 + 3.2 = 22.9 → 23
    // We tolerate [16, 25] — the calibration doc's mental arithmetic
    // didn't account for full precision on Couverture (88 × 0.15).
    expect(r.raw).toBeGreaterThanOrEqual(16);
    expect(r.raw).toBeLessThanOrEqual(25);
    expect(r.band).toBe("rose");
  });
});

/* -------------------------------------------------------------------------- */
/*  Output shape contract                                                      */
/* -------------------------------------------------------------------------- */

describe("composeHealthScore — output contract", () => {
  it("computedAt is the injected now in ISO format", () => {
    const r = composeHealthScore({
      axes: profileBAxes(),
      previousSmoothed: null,
      previousDisplay: null,
      previousBand: null,
      previousSnapshotCount: 1,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.computedAt).toBe(NOW.toISOString());
  });

  it("returns a stable fhsVersion", () => {
    const r = composeHealthScore({
      axes: profileBAxes(),
      previousSmoothed: null,
      previousDisplay: null,
      previousBand: null,
      previousSnapshotCount: 1,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.fhsVersion).toBe("1.0.0");
  });

  it("never returns score outside [0, 100]", () => {
    // Try absurd scores — clamp must protect.
    const axes: Record<AxisId, AxisResult> = {
      discipline: axis("discipline", 200),
      resilience: axis("resilience", -50),
      trajectoire: axis("trajectoire", 75),
      couverture: axis("couverture", 50),
      objectifs: axis("objectifs", 30),
      comportement: axis("comportement", 90),
    };
    const r = composeHealthScore({
      axes,
      previousSmoothed: 80,
      previousDisplay: 80,
      previousBand: "or",
      previousSnapshotCount: 5,
      signals: healthySignals(),
      now: NOW,
    });
    expect(r.raw).toBeGreaterThanOrEqual(0);
    expect(r.raw).toBeLessThanOrEqual(100);
    expect(r.smoothed).toBeGreaterThanOrEqual(0);
    expect(r.smoothed).toBeLessThanOrEqual(100);
    expect(r.display).toBeGreaterThanOrEqual(0);
    expect(r.display).toBeLessThanOrEqual(100);
  });
});
