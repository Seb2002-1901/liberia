import { describe, expect, it } from "vitest";
import {
  axisBarPct,
  axisBarTone,
  bandFromScore,
  bandTheme,
  classifyDelta,
  confidencePillTone,
  formatDelta,
  momentumChip,
  previousScoreFor,
  ringArcOffset,
} from "@/lib/calculations/health/ui-helpers";
import { FHS_VERSION } from "@/lib/calculations/health/constants";
import type {
  HealthScoreResult,
  MomentumResult,
} from "@/lib/calculations/health/types";

/* -------------------------------------------------------------------------- */
/*  bandFromScore                                                              */
/* -------------------------------------------------------------------------- */

describe("bandFromScore", () => {
  it("maps thresholds exactly: 39 rose, 40 ambre, 64 ambre, 65 or, 84 or, 85 emeraude", () => {
    expect(bandFromScore(39)).toBe("rose");
    expect(bandFromScore(40)).toBe("ambre");
    expect(bandFromScore(64)).toBe("ambre");
    expect(bandFromScore(65)).toBe("or");
    expect(bandFromScore(84)).toBe("or");
    expect(bandFromScore(85)).toBe("emeraude");
    expect(bandFromScore(0)).toBe("rose");
    expect(bandFromScore(100)).toBe("emeraude");
  });
});

/* -------------------------------------------------------------------------- */
/*  bandTheme                                                                  */
/* -------------------------------------------------------------------------- */

describe("bandTheme", () => {
  it("neutralises the palette when confidence is INSUFFICIENT_DATA", () => {
    const t = bandTheme("or", "INSUFFICIENT_DATA");
    expect(t.neutral).toBe(true);
    expect(t.arc).toContain("muted-foreground");
  });

  it("returns a coloured palette per band when confidence is HIGH", () => {
    expect(bandTheme("rose", "HIGH").neutral).toBe(false);
    expect(bandTheme("rose", "HIGH").arc).toContain("rose");
    expect(bandTheme("ambre", "HIGH").arc).toContain("gold");
    expect(bandTheme("or", "HIGH").arc).toContain("emerald");
    expect(bandTheme("emeraude", "HIGH").arc).toContain("emerald");
  });
});

/* -------------------------------------------------------------------------- */
/*  ringArcOffset                                                              */
/* -------------------------------------------------------------------------- */

describe("ringArcOffset", () => {
  it("offset = 0 when score is 100 (full ring)", () => {
    const { offset } = ringArcOffset(100, 36);
    expect(offset).toBeCloseTo(0, 5);
  });

  it("offset = circumference when score is 0 (empty ring)", () => {
    const { circumference, offset } = ringArcOffset(0, 36);
    expect(offset).toBeCloseTo(circumference, 5);
  });

  it("offset is half the circumference at score 50", () => {
    const { circumference, offset } = ringArcOffset(50, 36);
    expect(offset).toBeCloseTo(circumference / 2, 5);
  });

  it("clamps scores outside [0, 100] (no negative arcs, no overflow)", () => {
    const { circumference, offset: low } = ringArcOffset(-25, 36);
    expect(low).toBeCloseTo(circumference, 5);
    const { offset: high } = ringArcOffset(150, 36);
    expect(high).toBeCloseTo(0, 5);
  });
});

/* -------------------------------------------------------------------------- */
/*  Delta classification + formatting                                          */
/* -------------------------------------------------------------------------- */

describe("classifyDelta", () => {
  it("returns ABSENT when delta is null", () => {
    expect(classifyDelta(null)).toBe("ABSENT");
  });
  it("returns POSITIVE for positive delta", () => {
    expect(classifyDelta(2)).toBe("POSITIVE");
  });
  it("returns NEGATIVE for negative delta", () => {
    expect(classifyDelta(-1)).toBe("NEGATIVE");
  });
  it("returns STABLE for zero", () => {
    expect(classifyDelta(0)).toBe("STABLE");
  });
});

describe("formatDelta", () => {
  it("formats positive as +N (no sign on STABLE)", () => {
    expect(formatDelta(2)).toBe("+2");
    expect(formatDelta(1)).toBe("+1");
  });

  it("formats negative with unicode minus and absolute value", () => {
    expect(formatDelta(-1)).toBe("−1");
    expect(formatDelta(-12)).toBe("−12");
  });

  it("renders STABLE as em-dash, ABSENT as null", () => {
    expect(formatDelta(0)).toBe("—");
    expect(formatDelta(null)).toBeNull();
  });

  it("never returns a decimal (per calibration arbitration Q7)", () => {
    expect(formatDelta(3)).not.toContain(".");
    expect(formatDelta(-7)).not.toContain(".");
  });
});

/* -------------------------------------------------------------------------- */
/*  momentumChip                                                               */
/* -------------------------------------------------------------------------- */

describe("momentumChip", () => {
  it("returns null when momentum is null (no trajectory yet)", () => {
    expect(momentumChip(null)).toBeNull();
  });

  it("UP momentum gets the ↗ glyph", () => {
    const m: MomentumResult = {
      direction: "UP", strength: "MEDIUM", delta4Weeks: 5, windowSize: 4,
    };
    const chip = momentumChip(m);
    expect(chip?.glyph).toBe("↗");
    expect(chip?.directionKey).toBe("directionUP");
    expect(chip?.strengthKey).toBe("strengthMEDIUM");
    expect(chip?.weeks).toBe(4);
  });

  it("DOWN gets ↘, FLAT gets →", () => {
    expect(
      momentumChip({ direction: "DOWN", strength: "STRONG", delta4Weeks: -10, windowSize: 4 })?.glyph,
    ).toBe("↘");
    expect(
      momentumChip({ direction: "FLAT", strength: "WEAK", delta4Weeks: 1, windowSize: 3 })?.glyph,
    ).toBe("→");
  });

  it("exposes the strength key consistently across directions", () => {
    expect(
      momentumChip({ direction: "UP", strength: "WEAK", delta4Weeks: 2, windowSize: 2 })?.strengthKey,
    ).toBe("strengthWEAK");
    expect(
      momentumChip({ direction: "DOWN", strength: "STRONG", delta4Weeks: -8, windowSize: 4 })?.strengthKey,
    ).toBe("strengthSTRONG");
  });
});

/* -------------------------------------------------------------------------- */
/*  confidencePillTone                                                         */
/* -------------------------------------------------------------------------- */

describe("confidencePillTone", () => {
  it("INSUFFICIENT_DATA stays NEUTRAL (not rose) — anti accusatory", () => {
    const tone = confidencePillTone("INSUFFICIENT_DATA");
    expect(tone).not.toContain("rose");
    expect(tone).toContain("muted");
  });

  it("each confidence tier has a distinct tone", () => {
    const high = confidencePillTone("HIGH");
    const medium = confidencePillTone("MEDIUM");
    const low = confidencePillTone("LOW");
    expect(high).not.toBe(medium);
    expect(medium).not.toBe(low);
    expect(low).toContain("rose");
    expect(high).toContain("emerald");
  });
});

/* -------------------------------------------------------------------------- */
/*  Axis bar                                                                   */
/* -------------------------------------------------------------------------- */

describe("axisBarPct", () => {
  it("clamps to 0-100 integer", () => {
    expect(axisBarPct(72.3)).toBe(72);
    expect(axisBarPct(-5)).toBe(0);
    expect(axisBarPct(150)).toBe(100);
  });
});

describe("axisBarTone", () => {
  it("muted tone when axis confidence is UNKNOWN (axis excluded from sum)", () => {
    expect(axisBarTone(50, "UNKNOWN")).toContain("muted");
  });
  it("rose under 40, gold under 65, emerald above", () => {
    expect(axisBarTone(20, "HIGH")).toContain("rose");
    expect(axisBarTone(50, "HIGH")).toContain("gold");
    expect(axisBarTone(80, "HIGH")).toContain("emerald");
  });
});

/* -------------------------------------------------------------------------- */
/*  previousScoreFor                                                           */
/* -------------------------------------------------------------------------- */

describe("previousScoreFor", () => {
  it("forwards previousScore from the snapshot, null on first", () => {
    const base: HealthScoreResult = {
      raw: 70, smoothed: 70, display: 70,
      confidence: "HIGH", band: "or",
      axes: {} as HealthScoreResult["axes"],
      previousScore: null, previousBand: null,
      fhsVersion: FHS_VERSION, computedAt: "2026-06-08T12:00:00Z",
    };
    expect(previousScoreFor(base)).toBeNull();
    expect(previousScoreFor({ ...base, previousScore: 68 })).toBe(68);
  });
});
