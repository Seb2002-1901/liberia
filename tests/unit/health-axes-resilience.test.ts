import { describe, expect, it } from "vitest";
import { computeResilience } from "@/lib/calculations/health/axes/resilience";

describe("computeResilience", () => {
  it("returns UNKNOWN when currentSavings is null", () => {
    const r = computeResilience({
      currentSavings: null,
      monthlyExpensesFixed: 3000,
      fixedExpensesCategoryCount: 3,
    });
    expect(r.confidence).toBe("UNKNOWN");
    expect(r.score).toBe(0);
  });

  it("returns LOW when currentSavings is 0", () => {
    const r = computeResilience({
      currentSavings: 0,
      monthlyExpensesFixed: 3000,
      fixedExpensesCategoryCount: 3,
    });
    expect(r.confidence).toBe("LOW");
    // runway = 0 → score 0
    expect(r.score).toBe(0);
  });

  it("returns score 100 with LOW confidence when no fixed expenses declared", () => {
    const r = computeResilience({
      currentSavings: 10000,
      monthlyExpensesFixed: 0,
      fixedExpensesCategoryCount: 0,
    });
    expect(r.score).toBe(100);
    expect(r.confidence).toBe("LOW");
  });

  it("computes runway and score for a 3-month emergency fund", () => {
    const r = computeResilience({
      currentSavings: 9000,
      monthlyExpensesFixed: 3000,
      fixedExpensesCategoryCount: 4,
    });
    // runway = 3, log2(4) × 28 = 56
    expect(r.components.runway_months).toBe(3);
    expect(r.score).toBe(56);
    expect(r.confidence).toBe("HIGH");
  });

  it("saturates at 100 around 12 months runway", () => {
    const r = computeResilience({
      currentSavings: 36000,
      monthlyExpensesFixed: 3000,
      fixedExpensesCategoryCount: 4,
    });
    // runway = 12, log2(13) × 28 ≈ 103.5 → clamp 100
    expect(r.score).toBe(100);
  });

  it("returns MEDIUM when fewer than 3 fixed expense categories", () => {
    const r = computeResilience({
      currentSavings: 3000,
      monthlyExpensesFixed: 3000,
      fixedExpensesCategoryCount: 2,
    });
    expect(r.confidence).toBe("MEDIUM");
  });

  it("Profile A — student rigorous (runway 1.5 months)", () => {
    const r = computeResilience({
      currentSavings: 2000,
      monthlyExpensesFixed: 1300,
      fixedExpensesCategoryCount: 3,
    });
    // runway ≈ 1.54, log2(2.54) × 28 ≈ 37.5 → 37 or 38
    expect(r.components.runway_months).toBeCloseTo(1.54, 1);
    expect(r.score).toBeGreaterThanOrEqual(36);
    expect(r.score).toBeLessThanOrEqual(40);
    expect(r.confidence).toBe("HIGH");
  });

  it("Profile H — couple in difficulty (runway 0.13)", () => {
    const r = computeResilience({
      currentSavings: 800,
      monthlyExpensesFixed: 6100,
      fixedExpensesCategoryCount: 4,
    });
    expect(r.score).toBeLessThanOrEqual(10);
    expect(r.confidence).toBe("HIGH");
  });

  it("stores raw inputs in components for delta engine", () => {
    const r = computeResilience({
      currentSavings: 9000,
      monthlyExpensesFixed: 3000,
      fixedExpensesCategoryCount: 4,
    });
    expect(r.components.saved).toBe(9000);
    expect(r.components.monthly_burn).toBe(3000);
  });

  it("score is always clamped to 0-100 (no negative, no overflow)", () => {
    const r = computeResilience({
      currentSavings: 1e6,
      monthlyExpensesFixed: 1,
      fixedExpensesCategoryCount: 5,
    });
    expect(r.score).toBe(100);
  });
});
