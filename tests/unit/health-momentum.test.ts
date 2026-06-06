import { describe, expect, it } from "vitest";
import { computeMomentum } from "@/lib/calculations/health/momentum";
import { FHS_VERSION } from "@/lib/calculations/health/constants";
import type {
  AxisId,
  AxisResult,
  HealthScoreResult,
} from "@/lib/calculations/health/types";

function snap(display: number, week: string): HealthScoreResult {
  // Minimal HealthScoreResult — momentum only reads `display`.
  const axes: Record<AxisId, AxisResult> = {
    discipline: { id: "discipline", score: 50, confidence: "HIGH", components: {} },
    resilience: { id: "resilience", score: 50, confidence: "HIGH", components: {} },
    trajectoire: { id: "trajectoire", score: 50, confidence: "HIGH", components: {} },
    couverture: { id: "couverture", score: 50, confidence: "HIGH", components: {} },
    objectifs: { id: "objectifs", score: 50, confidence: "HIGH", components: {} },
    comportement: { id: "comportement", score: 50, confidence: "HIGH", components: {} },
  };
  return {
    raw: display,
    smoothed: display,
    display,
    confidence: "HIGH",
    band: display >= 65 ? "or" : display >= 40 ? "ambre" : "rose",
    axes,
    previousScore: null,
    previousBand: null,
    fhsVersion: FHS_VERSION,
    computedAt: `2026-${week}T12:00:00Z`,
  };
}

describe("computeMomentum — degenerate inputs", () => {
  it("returns null when 0 snapshots", () => {
    expect(computeMomentum([])).toBeNull();
  });

  it("returns null when only 1 snapshot (no trajectory)", () => {
    expect(computeMomentum([snap(70, "06-08")])).toBeNull();
  });
});

describe("computeMomentum — direction", () => {
  it("FLAT when |delta| < 2 (avoid noise on tiny variations)", () => {
    const r = computeMomentum([snap(71, "06-08"), snap(70, "06-01")]);
    expect(r?.direction).toBe("FLAT");
    expect(r?.delta4Weeks).toBe(1);
  });

  it("UP at exactly +2 (threshold inclusive)", () => {
    const r = computeMomentum([snap(72, "06-08"), snap(70, "06-01")]);
    expect(r?.direction).toBe("UP");
  });

  it("DOWN at exactly -2", () => {
    const r = computeMomentum([snap(68, "06-08"), snap(70, "06-01")]);
    expect(r?.direction).toBe("DOWN");
  });

  it("FLAT at -1 (negative tiny move)", () => {
    const r = computeMomentum([snap(69, "06-08"), snap(70, "06-01")]);
    expect(r?.direction).toBe("FLAT");
  });
});

describe("computeMomentum — strength", () => {
  it("WEAK when |delta| < 3", () => {
    const r = computeMomentum([snap(72, "06-08"), snap(70, "06-01")]);
    expect(r?.strength).toBe("WEAK");
  });

  it("MEDIUM at +3 (lower boundary inclusive)", () => {
    const r = computeMomentum([snap(73, "06-08"), snap(70, "06-01")]);
    expect(r?.strength).toBe("MEDIUM");
  });

  it("MEDIUM at +7 (upper boundary exclusive)", () => {
    const r = computeMomentum([snap(77, "06-08"), snap(70, "06-01")]);
    expect(r?.strength).toBe("MEDIUM");
  });

  it("STRONG at +8 (threshold)", () => {
    const r = computeMomentum([snap(78, "06-08"), snap(70, "06-01")]);
    expect(r?.strength).toBe("STRONG");
  });

  it("STRONG at -10", () => {
    const r = computeMomentum([snap(60, "06-08"), snap(70, "06-01")]);
    expect(r?.direction).toBe("DOWN");
    expect(r?.strength).toBe("STRONG");
  });
});

describe("computeMomentum — window", () => {
  it("uses up to 4 snapshots", () => {
    const r = computeMomentum([
      snap(75, "06-29"),
      snap(72, "06-22"),
      snap(68, "06-15"),
      snap(65, "06-08"),
      snap(50, "06-01"), // outside the 4-week window
    ]);
    expect(r?.windowSize).toBe(4);
    expect(r?.delta4Weeks).toBe(10); // 75 - 65 (not 75 - 50)
  });

  it("reports actual window size when fewer than 4 snapshots", () => {
    const r = computeMomentum([snap(72, "06-08"), snap(70, "06-01")]);
    expect(r?.windowSize).toBe(2);
  });

  it("uses 3 snapshots when 3 are available", () => {
    const r = computeMomentum([
      snap(75, "06-15"),
      snap(70, "06-08"),
      snap(65, "06-01"),
    ]);
    expect(r?.windowSize).toBe(3);
    expect(r?.delta4Weeks).toBe(10);
  });
});

describe("computeMomentum — output contract", () => {
  it("preserves the signed delta in the output", () => {
    const r = computeMomentum([snap(60, "06-08"), snap(75, "06-01")]);
    expect(r?.delta4Weeks).toBe(-15);
  });

  it("does not mutate the input array", () => {
    const input = [snap(72, "06-08"), snap(70, "06-01")];
    const copy = [...input];
    computeMomentum(input);
    expect(input).toEqual(copy);
  });
});
