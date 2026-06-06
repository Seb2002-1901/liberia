import { describe, expect, it } from "vitest";
import {
  AXIS_ORDER,
  healthScoreResultFromRow,
  snapshotPayloadFromResult,
  type SnapshotRow,
} from "@/lib/services/health-snapshots";
import { FHS_VERSION } from "@/lib/calculations/health/constants";
import type {
  AxisId,
  AxisResult,
  HealthScoreResult,
} from "@/lib/calculations/health/types";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function axis(
  id: AxisId,
  score: number,
  confidence: AxisResult["confidence"] = "HIGH",
  components: Record<string, number> = {},
  details?: Record<string, string | string[]>,
): AxisResult {
  return { id, score, confidence, components, ...(details ? { details } : {}) };
}

function sampleResult(): HealthScoreResult {
  return {
    raw: 81,
    smoothed: 78,
    display: 78,
    confidence: "HIGH",
    band: "or",
    axes: {
      discipline: axis("discipline", 72, "HIGH", {
        budget_score: 80,
        savings_consistency: 75,
        budgets_total: 5,
        budgets_success: 4,
        budgets_critical: 0,
      }),
      resilience: axis("resilience", 78, "HIGH", {
        runway_months: 4.4,
        saved: 35000,
        monthly_burn: 8000,
      }),
      trajectoire: axis("trajectoire", 100, "HIGH", {
        savings_rate: 0.33,
        income_used: 12000,
        fixed: 8000,
      }),
      couverture: axis(
        "couverture",
        95,
        "HIGH",
        {
          structurelle: 95,
          filled_majors_count: 5,
          missing_majors_count: 0,
        },
        {
          filled_majors: ["income", "housing", "insurance", "food", "transport"],
          missing_majors: [],
        },
      ),
      objectifs: axis("objectifs", 61, "HIGH", {
        active_count: 2,
        chiffred_count: 2,
        avg_progress: 0.11,
        ever_completed: 0,
      }),
      comportement: axis("comportement", 72, "HIGH", {
        engagement: 18,
        tx_count: 18,
        coach_msg: 0,
        memory_entries: 0,
      }),
    },
    previousScore: 75,
    previousBand: "or",
    fhsVersion: FHS_VERSION,
    computedAt: "2026-06-08T12:00:00.000Z",
  };
}

/* -------------------------------------------------------------------------- */
/*  AXIS_ORDER constant                                                        */
/* -------------------------------------------------------------------------- */

describe("AXIS_ORDER", () => {
  it("matches the calibration document order (Discipline first, Comportement last)", () => {
    expect(AXIS_ORDER).toEqual([
      "discipline",
      "resilience",
      "trajectoire",
      "couverture",
      "objectifs",
      "comportement",
    ]);
  });
});

/* -------------------------------------------------------------------------- */
/*  snapshotPayloadFromResult                                                  */
/* -------------------------------------------------------------------------- */

describe("snapshotPayloadFromResult", () => {
  it("projects every top-level field onto the row shape", () => {
    const result = sampleResult();
    const payload = snapshotPayloadFromResult("user-abc", "2026-W23", result);

    expect(payload.user_id).toBe("user-abc");
    expect(payload.week).toBe("2026-W23");
    expect(payload.fhs_version).toBe(FHS_VERSION);
    expect(payload.raw_score).toBe(81);
    expect(payload.smoothed_score).toBe(78);
    expect(payload.display_score).toBe(78);
    expect(payload.confidence).toBe("HIGH");
    expect(payload.band).toBe("or");
    expect(payload.previous_score).toBe(75);
    expect(payload.previous_band).toBe("or");
    expect(payload.computed_at).toBe("2026-06-08T12:00:00.000Z");
  });

  it("places each axis result in its dedicated jsonb column", () => {
    const result = sampleResult();
    const payload = snapshotPayloadFromResult("user-abc", "2026-W23", result);

    expect(payload.axis_discipline.id).toBe("discipline");
    expect(payload.axis_resilience.id).toBe("resilience");
    expect(payload.axis_trajectoire.id).toBe("trajectoire");
    expect(payload.axis_couverture.id).toBe("couverture");
    expect(payload.axis_objectifs.id).toBe("objectifs");
    expect(payload.axis_comportement.id).toBe("comportement");
  });

  it("preserves AxisResult.details (Couverture filled_majors)", () => {
    const result = sampleResult();
    const payload = snapshotPayloadFromResult("user-abc", "2026-W23", result);
    expect(payload.axis_couverture.details?.filled_majors).toEqual([
      "income",
      "housing",
      "insurance",
      "food",
      "transport",
    ]);
  });

  it("preserves null previous fields on the first snapshot", () => {
    const result: HealthScoreResult = {
      ...sampleResult(),
      previousScore: null,
      previousBand: null,
    };
    const payload = snapshotPayloadFromResult("user-abc", "2026-W23", result);
    expect(payload.previous_score).toBeNull();
    expect(payload.previous_band).toBeNull();
  });

  it("preserves INSUFFICIENT_DATA confidence", () => {
    const result: HealthScoreResult = {
      ...sampleResult(),
      confidence: "INSUFFICIENT_DATA",
    };
    const payload = snapshotPayloadFromResult("user-abc", "2026-W23", result);
    expect(payload.confidence).toBe("INSUFFICIENT_DATA");
  });
});

/* -------------------------------------------------------------------------- */
/*  healthScoreResultFromRow                                                   */
/* -------------------------------------------------------------------------- */

describe("healthScoreResultFromRow", () => {
  function rowFromResult(result: HealthScoreResult): SnapshotRow {
    return snapshotPayloadFromResult("user-abc", "2026-W23", result) as SnapshotRow;
  }

  it("reconstructs every top-level field", () => {
    const result = sampleResult();
    const row = rowFromResult(result);
    const reconstructed = healthScoreResultFromRow(row);

    expect(reconstructed.raw).toBe(81);
    expect(reconstructed.smoothed).toBe(78);
    expect(reconstructed.display).toBe(78);
    expect(reconstructed.confidence).toBe("HIGH");
    expect(reconstructed.band).toBe("or");
    expect(reconstructed.previousScore).toBe(75);
    expect(reconstructed.previousBand).toBe("or");
    expect(reconstructed.fhsVersion).toBe(FHS_VERSION);
    expect(reconstructed.computedAt).toBe("2026-06-08T12:00:00.000Z");
  });

  it("reconstructs every axis with id, score, confidence and components", () => {
    const result = sampleResult();
    const reconstructed = healthScoreResultFromRow(rowFromResult(result));

    for (const id of AXIS_ORDER) {
      expect(reconstructed.axes[id].id).toBe(id);
      expect(reconstructed.axes[id].score).toBe(result.axes[id].score);
      expect(reconstructed.axes[id].confidence).toBe(result.axes[id].confidence);
      expect(reconstructed.axes[id].components).toEqual(result.axes[id].components);
    }
  });

  it("preserves details on Couverture roundtrip", () => {
    const result = sampleResult();
    const reconstructed = healthScoreResultFromRow(rowFromResult(result));
    expect(reconstructed.axes.couverture.details?.filled_majors).toEqual(
      result.axes.couverture.details?.filled_majors,
    );
  });

  it("throws when an axis blob has the wrong id (hand-edited row guard)", () => {
    const result = sampleResult();
    const row = rowFromResult(result);
    // Simulate a hand-edited row : the discipline column holds a
    // résilience blob.
    row.axis_discipline = { ...result.axes.resilience };

    expect(() => healthScoreResultFromRow(row)).toThrow(/discipline/);
  });

  it("throws when an axis blob is empty", () => {
    const result = sampleResult();
    const row = rowFromResult(result);
    row.axis_objectifs = null as unknown as AxisResult;
    expect(() => healthScoreResultFromRow(row)).toThrow(/objectifs/);
  });

  it("throws when an axis blob is missing score or confidence", () => {
    const result = sampleResult();
    const row = rowFromResult(result);
    row.axis_resilience = { id: "resilience" } as unknown as AxisResult;
    expect(() => healthScoreResultFromRow(row)).toThrow(/resilience/);
  });
});

/* -------------------------------------------------------------------------- */
/*  Roundtrip invariant                                                        */
/* -------------------------------------------------------------------------- */

describe("HealthScoreResult ⇄ SnapshotRow roundtrip", () => {
  it("snapshotPayloadFromResult then healthScoreResultFromRow yields the same object", () => {
    const result = sampleResult();
    const row = snapshotPayloadFromResult(
      "user-abc",
      "2026-W23",
      result,
    ) as SnapshotRow;
    const reconstructed = healthScoreResultFromRow(row);

    expect(reconstructed).toEqual(result);
  });

  it("roundtrip preserves INSUFFICIENT_DATA + null previousScore + UNKNOWN axes", () => {
    const result: HealthScoreResult = {
      ...sampleResult(),
      confidence: "INSUFFICIENT_DATA",
      previousScore: null,
      previousBand: null,
      axes: {
        ...sampleResult().axes,
        objectifs: axis("objectifs", 0, "UNKNOWN", { active_count: 0 }),
      },
    };
    const row = snapshotPayloadFromResult(
      "user-abc",
      "2026-W23",
      result,
    ) as SnapshotRow;
    const reconstructed = healthScoreResultFromRow(row);
    expect(reconstructed).toEqual(result);
  });
});
