import { describe, expect, it } from "vitest";
import { computeDisciplineScore } from "@/lib/calculations/discipline";
import type { BudgetStatusRow } from "@/lib/calculations/analytics";

// Phase 3.1.3 — discipline score. Each test pins one axis so a future
// edit to the weights or thresholds fails loudly rather than silently
// changing the user-facing number.

const PERFECT_BUDGET: BudgetStatusRow[] = [
  { category: "food", spent: 0, limit: 600, ratio: 0, status: "ok", remaining: 600 },
  { category: "leisure", spent: 0, limit: 300, ratio: 0, status: "ok", remaining: 300 },
];

const OVER_BUDGET: BudgetStatusRow[] = [
  { category: "food", spent: 800, limit: 600, ratio: 1.33, status: "over", remaining: -200 },
];

describe("computeDisciplineScore — components are bounded", () => {
  it("returns 0 on a freshly created empty account", () => {
    const r = computeDisciplineScore({
      budgetStatus: [],
      savingsRate: 0,
      runwayMonths: 0,
      monthlyTransactions: 0,
    });
    expect(r.score).toBe(0);
    expect(r.tier).toBe("low");
  });

  it("reaches the cap at the healthy thresholds (20% savings, 3mo, budgets ok, tx > 0)", () => {
    const r = computeDisciplineScore({
      budgetStatus: PERFECT_BUDGET,
      savingsRate: 0.2,
      runwayMonths: 3,
      monthlyTransactions: 5,
    });
    expect(r.score).toBe(100);
    expect(r.tier).toBe("excellent");
    expect(r.weakest).toBe("none");
  });

  it("does NOT penalise a user who has set no budgets", () => {
    // Without budgets, max attainable = 100 - 35 = 65 (no penalty,
    // just no positive contribution). So a user without budgets but
    // perfect on other axes still lands in the "good" tier.
    const r = computeDisciplineScore({
      budgetStatus: [],
      savingsRate: 0.2,
      runwayMonths: 3,
      monthlyTransactions: 1,
    });
    expect(r.score).toBe(65);
    expect(r.tier).toBe("good");
  });
});

describe("computeDisciplineScore — weakest axis pinpoints the dominant pain", () => {
  it("flags 'budget' when any category is over, even if other axes are healthy", () => {
    const r = computeDisciplineScore({
      budgetStatus: OVER_BUDGET,
      savingsRate: 0.2,
      runwayMonths: 12,
      monthlyTransactions: 3,
    });
    expect(r.weakest).toBe("budget");
  });

  it("flags 'emergency' when runway < 1 month and budgets are clean", () => {
    const r = computeDisciplineScore({
      budgetStatus: PERFECT_BUDGET,
      savingsRate: 0.2,
      runwayMonths: 0.5,
      monthlyTransactions: 3,
    });
    expect(r.weakest).toBe("emergency");
  });

  it("flags 'savings' when rate < 5% and runway is fine", () => {
    const r = computeDisciplineScore({
      budgetStatus: PERFECT_BUDGET,
      savingsRate: 0.02,
      runwayMonths: 6,
      monthlyTransactions: 3,
    });
    expect(r.weakest).toBe("savings");
  });
});

describe("computeDisciplineScore — partial credit math", () => {
  it("savings half (10% rate) gives roughly half the savings axis", () => {
    const r = computeDisciplineScore({
      budgetStatus: [],
      savingsRate: 0.1,
      runwayMonths: 0,
      monthlyTransactions: 0,
    });
    // 10% / 20% threshold = 0.5 * 30 = 15.
    expect(r.breakdown.savings).toBe(15);
  });

  it("emergency two months gives roughly two-thirds the emergency axis", () => {
    const r = computeDisciplineScore({
      budgetStatus: [],
      savingsRate: 0,
      runwayMonths: 2,
      monthlyTransactions: 0,
    });
    // 2 / 3 * 25 = 16.67 ≈ 17
    expect(r.breakdown.emergency).toBe(17);
  });

  it("caps the emergency component above 3 months — no extra credit for hoarding", () => {
    const r = computeDisciplineScore({
      budgetStatus: [],
      savingsRate: 0,
      runwayMonths: 24,
      monthlyTransactions: 0,
    });
    expect(r.breakdown.emergency).toBe(25);
  });

  it("tracking is binary: 0 tx → 0, ≥1 → full 10 pts", () => {
    expect(
      computeDisciplineScore({
        budgetStatus: [],
        savingsRate: 0,
        runwayMonths: 0,
        monthlyTransactions: 0,
      }).breakdown.tracking,
    ).toBe(0);
    expect(
      computeDisciplineScore({
        budgetStatus: [],
        savingsRate: 0,
        runwayMonths: 0,
        monthlyTransactions: 1,
      }).breakdown.tracking,
    ).toBe(10);
  });
});
