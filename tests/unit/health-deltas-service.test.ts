import { describe, expect, it } from "vitest";
import {
  deltaExplanationFromRow,
  deltaPayloadFromExplanation,
  type DeltaRow,
} from "@/lib/services/health-deltas";
import { FHS_VERSION } from "@/lib/calculations/health/constants";
import type { DeltaExplanation } from "@/lib/calculations/health/types";

function sampleExplanation(): DeltaExplanation {
  return {
    netDelta: 3,
    contributors: [
      {
        axis: "resilience",
        deltaPoints: 3,
        reasonKey: "resilience_runway_improved",
        payload: { from: 2.7, to: 3.0 },
      },
      {
        axis: "discipline",
        deltaPoints: 2,
        reasonKey: "discipline_budget_streak_improved",
        payload: { successCount: 4, total: 5 },
      },
      {
        axis: "trajectoire",
        deltaPoints: -2,
        reasonKey: "trajectoire_savings_rate_declined",
        payload: { fromPct: 16, toPct: 14 },
      },
    ],
    fhsVersion: FHS_VERSION,
    fromWeek: "2026-W22",
    toWeek: "2026-W23",
  };
}

describe("deltaPayloadFromExplanation", () => {
  it("projects all fields onto the row shape", () => {
    const payload = deltaPayloadFromExplanation("user-abc", sampleExplanation());
    expect(payload.user_id).toBe("user-abc");
    expect(payload.week_to).toBe("2026-W23");
    expect(payload.week_from).toBe("2026-W22");
    expect(payload.fhs_version).toBe(FHS_VERSION);
    expect(payload.net_delta).toBe(3);
    expect(payload.contributors.length).toBe(3);
    expect(payload.contributors[0].axis).toBe("resilience");
  });

  it("preserves contributor payloads verbatim (no flattening)", () => {
    const payload = deltaPayloadFromExplanation("user-abc", sampleExplanation());
    expect(payload.contributors[0].payload).toEqual({ from: 2.7, to: 3.0 });
    expect(payload.contributors[2].payload).toEqual({ fromPct: 16, toPct: 14 });
  });

  it("preserves negative net deltas (deficit weeks)", () => {
    const exp: DeltaExplanation = { ...sampleExplanation(), netDelta: -5 };
    const payload = deltaPayloadFromExplanation("user-abc", exp);
    expect(payload.net_delta).toBe(-5);
  });

  it("preserves an empty contributors array for stable_period fallback", () => {
    const exp: DeltaExplanation = {
      ...sampleExplanation(),
      netDelta: 0,
      contributors: [
        {
          axis: "discipline",
          deltaPoints: 0,
          reasonKey: "stable_period",
          payload: {},
        },
      ],
    };
    const payload = deltaPayloadFromExplanation("user-abc", exp);
    expect(payload.contributors.length).toBe(1);
    expect(payload.contributors[0].reasonKey).toBe("stable_period");
  });
});

describe("deltaExplanationFromRow", () => {
  function rowFor(exp: DeltaExplanation): DeltaRow {
    return {
      ...deltaPayloadFromExplanation("user-abc", exp),
      computed_at: "2026-06-08T12:00:00.000Z",
    };
  }

  it("reconstructs every top-level field", () => {
    const exp = sampleExplanation();
    const reconstructed = deltaExplanationFromRow(rowFor(exp));
    expect(reconstructed.netDelta).toBe(3);
    expect(reconstructed.fromWeek).toBe("2026-W22");
    expect(reconstructed.toWeek).toBe("2026-W23");
    expect(reconstructed.fhsVersion).toBe(FHS_VERSION);
  });

  it("reconstructs contributors in original order with their payloads", () => {
    const exp = sampleExplanation();
    const reconstructed = deltaExplanationFromRow(rowFor(exp));
    expect(reconstructed.contributors).toEqual(exp.contributors);
  });
});

describe("DeltaExplanation ⇄ DeltaRow roundtrip", () => {
  it("preserves the full explanation through the row", () => {
    const exp = sampleExplanation();
    const row: DeltaRow = {
      ...deltaPayloadFromExplanation("user-abc", exp),
      computed_at: "2026-06-08T12:00:00.000Z",
    };
    expect(deltaExplanationFromRow(row)).toEqual(exp);
  });

  it("roundtrip for an empty-contributors fallback", () => {
    const exp: DeltaExplanation = {
      netDelta: 0,
      contributors: [],
      fhsVersion: FHS_VERSION,
      fromWeek: "2026-W22",
      toWeek: "2026-W23",
    };
    const row: DeltaRow = {
      ...deltaPayloadFromExplanation("user-abc", exp),
      computed_at: "2026-06-08T12:00:00.000Z",
    };
    expect(deltaExplanationFromRow(row)).toEqual(exp);
  });
});
