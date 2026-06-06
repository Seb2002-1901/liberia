import { describe, expect, it } from "vitest";
import { computeAdviceConfidence } from "@/lib/calculations/advice-confidence";
import type { CompletenessResult } from "@/lib/calculations/completeness";

// Phase 3.1.10 — coach confidence gate. Lock every boundary so a
// future tweak to the thresholds doesn't silently change how
// assertive the coach sounds.

function completeness(
  reliability: CompletenessResult["reliability"],
  structurelle: number,
): CompletenessResult {
  return {
    score: structurelle,
    structurelle,
    detaillee: 0,
    optimale: 0,
    detected: [],
    missing: [],
    reliability,
    canEstimateSavings: false,
  };
}

describe("computeAdviceConfidence — LOW gate", () => {
  it("structurelle < 70 always falls back to LOW (structurelle gap)", () => {
    const r = computeAdviceConfidence({
      completeness: completeness("low", 65),
      hasBudgets: true,
      hasGoals: true,
      memoryEntriesCount: 10,
      hasPersonalityNotes: true,
    });
    expect(r.level).toBe("LOW");
    expect(r.weakest).toBe("structurelle");
  });

  it("no memory of any kind → LOW (memory gap) even when structurelle is fine", () => {
    const r = computeAdviceConfidence({
      completeness: completeness("high", 100),
      hasBudgets: true,
      hasGoals: false,
      memoryEntriesCount: 0,
      hasPersonalityNotes: false,
    });
    expect(r.level).toBe("LOW");
    expect(r.weakest).toBe("memory");
  });

  it("structurelle gap wins over memory gap when both apply", () => {
    const r = computeAdviceConfidence({
      completeness: completeness("low", 30),
      hasBudgets: false,
      hasGoals: false,
      memoryEntriesCount: 0,
      hasPersonalityNotes: false,
    });
    expect(r.weakest).toBe("structurelle");
  });
});

describe("computeAdviceConfidence — HIGH gate", () => {
  it("requires structurelle >= 90 AND budgets AND rich memory", () => {
    const r = computeAdviceConfidence({
      completeness: completeness("high", 95),
      hasBudgets: true,
      hasGoals: true,
      memoryEntriesCount: 5,
      hasPersonalityNotes: true,
    });
    expect(r.level).toBe("HIGH");
    expect(r.weakest).toBe("none");
  });

  it("rich memory can come from 3+ dynamic entries alone (no personality notes)", () => {
    const r = computeAdviceConfidence({
      completeness: completeness("high", 95),
      hasBudgets: true,
      hasGoals: false,
      memoryEntriesCount: 3,
      hasPersonalityNotes: false,
    });
    expect(r.level).toBe("HIGH");
  });

  it("personality notes alone suffice (no dynamic entries)", () => {
    const r = computeAdviceConfidence({
      completeness: completeness("high", 95),
      hasBudgets: true,
      hasGoals: false,
      memoryEntriesCount: 0,
      hasPersonalityNotes: true,
    });
    // Note: when memoryEntriesCount=0 AND !hasPersonalityNotes AND
    // !hasGoals → LOW. Here hasPersonalityNotes is true so the LOW
    // gate doesn't fire; HIGH applies.
    expect(r.level).toBe("HIGH");
  });

  it("structurelle 89 → not HIGH (boundary is sharp)", () => {
    const r = computeAdviceConfidence({
      completeness: completeness("medium", 89),
      hasBudgets: true,
      hasGoals: true,
      memoryEntriesCount: 5,
      hasPersonalityNotes: true,
    });
    expect(r.level).toBe("MEDIUM");
  });
});

describe("computeAdviceConfidence — MEDIUM weakest detection", () => {
  it("no budgets → MEDIUM with weakest=budgets", () => {
    const r = computeAdviceConfidence({
      completeness: completeness("high", 95),
      hasBudgets: false,
      hasGoals: true,
      memoryEntriesCount: 5,
      hasPersonalityNotes: true,
    });
    expect(r.level).toBe("MEDIUM");
    expect(r.weakest).toBe("budgets");
  });

  it("thin memory (1 entry, no notes) → MEDIUM with weakest=memory", () => {
    const r = computeAdviceConfidence({
      completeness: completeness("high", 95),
      hasBudgets: true,
      hasGoals: false,
      memoryEntriesCount: 1,
      hasPersonalityNotes: false,
    });
    expect(r.level).toBe("MEDIUM");
    expect(r.weakest).toBe("memory");
  });

  it("structurelle 70-89 → MEDIUM with weakest=structurelle", () => {
    const r = computeAdviceConfidence({
      completeness: completeness("medium", 80),
      hasBudgets: true,
      hasGoals: true,
      memoryEntriesCount: 5,
      hasPersonalityNotes: true,
    });
    expect(r.level).toBe("MEDIUM");
    expect(r.weakest).toBe("structurelle");
  });
});
