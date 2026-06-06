import { describe, expect, it } from "vitest";
import {
  isInsufficientData,
  rollupGlobalConfidence,
  type InsufficientDataSignals,
} from "@/lib/calculations/health/confidence";
import type { AxisId, AxisResult } from "@/lib/calculations/health/types";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function axis(id: AxisId, score: number, confidence: AxisResult["confidence"] = "HIGH"): AxisResult {
  return { id, score, confidence, components: {} };
}

/** Signals representing a healthy mid-tier profile (passes every gate). */
function healthySignals(): InsufficientDataSignals {
  return {
    structurelle: 80,
    monthlyIncome: 4500,
    exploitableExpenses: 3600,
    filledMajorAreasCount: 4,
  };
}

function fullHighAxes(): Record<AxisId, AxisResult> {
  return {
    discipline: axis("discipline", 80),
    resilience: axis("resilience", 70),
    trajectoire: axis("trajectoire", 65),
    couverture: axis("couverture", 95),
    objectifs: axis("objectifs", 60),
    comportement: axis("comportement", 75),
  };
}

/* -------------------------------------------------------------------------- */
/*  isInsufficientData                                                         */
/* -------------------------------------------------------------------------- */

describe("isInsufficientData", () => {
  it("returns false on a healthy profile with history", () => {
    expect(
      isInsufficientData({
        signals: healthySignals(),
        previousSnapshotCount: 4,
      }),
    ).toBe(false);
  });

  it("returns true when structurelle < 40", () => {
    expect(
      isInsufficientData({
        signals: { ...healthySignals(), structurelle: 35 },
        previousSnapshotCount: 4,
      }),
    ).toBe(true);
  });

  it("returns true when monthlyIncome is 0", () => {
    expect(
      isInsufficientData({
        signals: { ...healthySignals(), monthlyIncome: 0 },
        previousSnapshotCount: 4,
      }),
    ).toBe(true);
  });

  it("returns true when exploitableExpenses is 0", () => {
    expect(
      isInsufficientData({
        signals: { ...healthySignals(), exploitableExpenses: 0 },
        previousSnapshotCount: 4,
      }),
    ).toBe(true);
  });

  it("returns true when fewer than 2 major areas filled", () => {
    expect(
      isInsufficientData({
        signals: { ...healthySignals(), filledMajorAreasCount: 1 },
        previousSnapshotCount: 4,
      }),
    ).toBe(true);
  });

  it("returns true on the very first computation (no history)", () => {
    expect(
      isInsufficientData({
        signals: healthySignals(),
        previousSnapshotCount: 0,
      }),
    ).toBe(true);
  });

  it("returns false at exactly the structurelle threshold (= 40)", () => {
    expect(
      isInsufficientData({
        signals: { ...healthySignals(), structurelle: 40 },
        previousSnapshotCount: 4,
      }),
    ).toBe(false);
  });

  it("returns false with exactly 2 major areas filled (= threshold)", () => {
    expect(
      isInsufficientData({
        signals: { ...healthySignals(), filledMajorAreasCount: 2 },
        previousSnapshotCount: 4,
      }),
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*  rollupGlobalConfidence                                                     */
/* -------------------------------------------------------------------------- */

describe("rollupGlobalConfidence", () => {
  it("short-circuits to INSUFFICIENT_DATA when signals are too thin", () => {
    const r = rollupGlobalConfidence({
      axes: fullHighAxes(),
      signals: { ...healthySignals(), monthlyIncome: 0 },
      previousSnapshotCount: 4,
    });
    expect(r).toBe("INSUFFICIENT_DATA");
  });

  it("short-circuits even when every axis reports HIGH", () => {
    // Worst trap : 6 confident axes but the user has no income — we
    // MUST refuse to interpret rather than pretend the score is solid.
    const r = rollupGlobalConfidence({
      axes: fullHighAxes(),
      signals: { ...healthySignals(), structurelle: 10 },
      previousSnapshotCount: 4,
    });
    expect(r).toBe("INSUFFICIENT_DATA");
  });

  it("returns HIGH when ≥ 5 axes are HIGH", () => {
    const axes = fullHighAxes();
    axes.comportement = axis("comportement", 30, "MEDIUM");
    const r = rollupGlobalConfidence({
      axes,
      signals: healthySignals(),
      previousSnapshotCount: 4,
    });
    expect(r).toBe("HIGH");
  });

  it("returns MEDIUM when 3 or 4 axes are HIGH", () => {
    const axes = fullHighAxes();
    axes.objectifs = axis("objectifs", 30, "MEDIUM");
    axes.comportement = axis("comportement", 30, "MEDIUM");
    axes.couverture = axis("couverture", 30, "LOW");
    // 3 HIGH remaining
    const r = rollupGlobalConfidence({
      axes,
      signals: healthySignals(),
      previousSnapshotCount: 4,
    });
    expect(r).toBe("MEDIUM");
  });

  it("returns LOW when fewer than 3 axes are HIGH", () => {
    const axes = fullHighAxes();
    axes.discipline = axis("discipline", 30, "LOW");
    axes.resilience = axis("resilience", 30, "LOW");
    axes.trajectoire = axis("trajectoire", 30, "MEDIUM");
    axes.couverture = axis("couverture", 30, "MEDIUM");
    // 2 HIGH remaining (objectifs + comportement)
    const r = rollupGlobalConfidence({
      axes,
      signals: healthySignals(),
      previousSnapshotCount: 4,
    });
    expect(r).toBe("LOW");
  });

  it("treats UNKNOWN axes as NOT-HIGH in the rollup", () => {
    const axes = fullHighAxes();
    axes.couverture = axis("couverture", 30, "UNKNOWN");
    axes.objectifs = axis("objectifs", 30, "UNKNOWN");
    axes.comportement = axis("comportement", 30, "UNKNOWN");
    // 3 HIGH remaining → MEDIUM
    const r = rollupGlobalConfidence({
      axes,
      signals: healthySignals(),
      previousSnapshotCount: 4,
    });
    expect(r).toBe("MEDIUM");
  });
});
