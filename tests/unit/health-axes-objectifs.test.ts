import { describe, expect, it } from "vitest";
import { computeObjectifs } from "@/lib/calculations/health/axes/objectifs";

describe("computeObjectifs", () => {
  it("returns UNKNOWN on empty account (no activity)", () => {
    const r = computeObjectifs({
      activeGoals: [],
      completedGoalsCount: 0,
      profileHasActivity: false,
    });
    expect(r.confidence).toBe("UNKNOWN");
    expect(r.score).toBe(0);
  });

  it("returns LOW when no goals but profile has activity", () => {
    const r = computeObjectifs({
      activeGoals: [],
      completedGoalsCount: 0,
      profileHasActivity: true,
    });
    expect(r.confidence).toBe("LOW");
    expect(r.score).toBe(0);
  });

  it("returns 30 after lifetime completion with no active goal", () => {
    const r = computeObjectifs({
      activeGoals: [],
      completedGoalsCount: 2,
      profileHasActivity: true,
    });
    expect(r.score).toBe(30);
  });

  it("base 50 with active goal at 0 % progress", () => {
    const r = computeObjectifs({
      activeGoals: [{ target_amount: 10000, current_amount: 0 }],
      completedGoalsCount: 0,
      profileHasActivity: true,
    });
    expect(r.score).toBe(50);
    expect(r.confidence).toBe("HIGH");
  });

  it("100 with single active goal at 100 % progress (not yet archived)", () => {
    const r = computeObjectifs({
      activeGoals: [{ target_amount: 10000, current_amount: 10000 }],
      completedGoalsCount: 0,
      profileHasActivity: true,
    });
    expect(r.score).toBe(100);
  });

  it("Profile A example — one goal at 40 %", () => {
    const r = computeObjectifs({
      activeGoals: [{ target_amount: 2000, current_amount: 800 }],
      completedGoalsCount: 0,
      profileHasActivity: true,
    });
    // 50 + 50 × 0.4 = 70
    expect(r.score).toBe(70);
  });

  it("averages progress across multiple goals", () => {
    const r = computeObjectifs({
      activeGoals: [
        { target_amount: 1000, current_amount: 200 }, // 20 %
        { target_amount: 1000, current_amount: 800 }, // 80 %
      ],
      completedGoalsCount: 0,
      profileHasActivity: true,
    });
    // avg = 50 % → score = 50 + 25 = 75
    expect(r.score).toBe(75);
  });

  it("caps individual progress at 100 % to avoid bonus on overshoot", () => {
    const r = computeObjectifs({
      activeGoals: [{ target_amount: 1000, current_amount: 3000 }], // 300 %
      completedGoalsCount: 0,
      profileHasActivity: true,
    });
    // capped at 1 → 100
    expect(r.score).toBe(100);
  });

  it("returns MEDIUM when active goal has no chiffred target", () => {
    const r = computeObjectifs({
      activeGoals: [{ target_amount: 0, current_amount: 0 }],
      completedGoalsCount: 0,
      profileHasActivity: true,
    });
    expect(r.confidence).toBe("MEDIUM");
    // base credit without chiffred progress
    expect(r.score).toBe(50);
  });

  it("ignores goals with target 0 when computing avg_progress", () => {
    const r = computeObjectifs({
      activeGoals: [
        { target_amount: 0, current_amount: 0 },
        { target_amount: 1000, current_amount: 500 }, // 50 %
      ],
      completedGoalsCount: 0,
      profileHasActivity: true,
    });
    // chiffredGoals = [{1000, 500}] → avg 0.5 → score 75
    expect(r.components.avg_progress).toBeCloseTo(0.5, 2);
    expect(r.score).toBe(75);
  });
});
