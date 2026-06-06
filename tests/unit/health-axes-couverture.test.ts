import { describe, expect, it } from "vitest";
import { computeCouverture } from "@/lib/calculations/health/axes/couverture";

describe("computeCouverture", () => {
  it("returns score 0 with MEDIUM confidence on empty profile", () => {
    const r = computeCouverture({
      structurelle: 0,
      filledMajorAreas: [],
      missingMajorAreas: ["income", "housing", "insurance"],
    });
    expect(r.score).toBe(0);
    expect(r.confidence).toBe("MEDIUM");
  });

  it("returns HIGH confidence as soon as one area is filled", () => {
    const r = computeCouverture({
      structurelle: 20,
      filledMajorAreas: ["income"],
      missingMajorAreas: ["housing", "insurance"],
    });
    expect(r.confidence).toBe("HIGH");
    expect(r.score).toBe(20);
  });

  it("score mirrors structurelle exactly", () => {
    for (const v of [10, 33, 50, 78, 95, 100]) {
      const r = computeCouverture({
        structurelle: v,
        filledMajorAreas: ["income"],
        missingMajorAreas: [],
      });
      expect(r.score).toBe(v);
    }
  });

  it("exposes filled and missing arrays via details", () => {
    const r = computeCouverture({
      structurelle: 60,
      filledMajorAreas: ["income", "housing"],
      missingMajorAreas: ["insurance", "transport"],
    });
    expect(r.details?.filled_majors).toEqual(["income", "housing"]);
    expect(r.details?.missing_majors).toEqual(["insurance", "transport"]);
    expect(r.components.filled_majors_count).toBe(2);
    expect(r.components.missing_majors_count).toBe(2);
  });

  it("clamps score to 0-100", () => {
    expect(
      computeCouverture({
        structurelle: 150,
        filledMajorAreas: ["a"],
        missingMajorAreas: [],
      }).score,
    ).toBe(100);
    expect(
      computeCouverture({
        structurelle: -5,
        filledMajorAreas: [],
        missingMajorAreas: [],
      }).score,
    ).toBe(0);
  });

  it("never returns UNKNOWN — couverture measures itself", () => {
    for (const v of [0, 33, 99]) {
      const r = computeCouverture({
        structurelle: v,
        filledMajorAreas: [],
        missingMajorAreas: [],
      });
      expect(r.confidence).not.toBe("UNKNOWN");
    }
  });
});
