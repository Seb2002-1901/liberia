import { describe, expect, it } from "vitest";
import { computeDiscipline } from "@/lib/calculations/health/axes/discipline";

describe("computeDiscipline", () => {
  it("returns UNKNOWN confidence when nothing is known", () => {
    const r = computeDiscipline({ budgets: [], savingsRatesByMonth: [] });
    expect(r.confidence).toBe("UNKNOWN");
    expect(r.score).toBe(70); // savings_consistency neutral default
  });

  it("returns LOW confidence with savings only, no budgets", () => {
    const r = computeDiscipline({
      budgets: [],
      savingsRatesByMonth: [0.15],
    });
    expect(r.confidence).toBe("LOW");
    // 1 month → savings_consistency = 70 default
    expect(r.score).toBe(70);
  });

  it("returns HIGH when 3+ budgets AND 3 months", () => {
    const r = computeDiscipline({
      budgets: [
        { status: "SUCCESS", percentage: 0.5 },
        { status: "SUCCESS", percentage: 0.6 },
        { status: "SUCCESS", percentage: 0.4 },
      ],
      savingsRatesByMonth: [0.15, 0.16, 0.14],
    });
    expect(r.confidence).toBe("HIGH");
  });

  it("applies +5 bonus when all budgets are under 70 %", () => {
    const r = computeDiscipline({
      budgets: [
        { status: "SUCCESS", percentage: 0.5 },
        { status: "SUCCESS", percentage: 0.6 },
      ],
      savingsRatesByMonth: [0.15, 0.15, 0.15],
    });
    // base = 100, +5 bonus → 105, clamped to 100
    expect(r.components.budget_score).toBe(100);
  });

  it("applies -10 malus when any budget is critically over (>120%)", () => {
    const r = computeDiscipline({
      budgets: [
        { status: "SUCCESS", percentage: 0.5 },
        { status: "OVER_LIMIT", percentage: 1.4 },
      ],
      savingsRatesByMonth: [0.15, 0.15],
    });
    // base = 50, -10 → 40
    expect(r.components.budget_score).toBe(40);
    expect(r.components.budgets_critical).toBe(1);
  });

  it("does NOT apply bonus when at least one budget is over 70 %", () => {
    const r = computeDiscipline({
      budgets: [
        { status: "SUCCESS", percentage: 0.5 },
        { status: "WARNING", percentage: 0.85 },
      ],
      savingsRatesByMonth: [0.15, 0.15],
    });
    // base = 50, no bonus, no malus → 50
    expect(r.components.budget_score).toBe(50);
  });

  it("combines budget and savings 60/40 when both are present", () => {
    const r = computeDiscipline({
      budgets: [{ status: "SUCCESS", percentage: 0.5 }], // budget_score = 100
      savingsRatesByMonth: [0.15, 0.15], // σ = 0 → savings_consistency = 100
    });
    // 0.6 × 100 + 0.4 × 100 = 100
    expect(r.score).toBe(100);
  });

  it("falls back to savings_consistency alone when no budgets", () => {
    const r = computeDiscipline({
      budgets: [],
      savingsRatesByMonth: [0.10, 0.15, 0.20], // some variance
    });
    // budgets empty → score = savings_consistency
    expect(r.score).toBe(r.components.savings_consistency);
  });

  it("savings_consistency = 0 when volatility crosses 10 %", () => {
    const r = computeDiscipline({
      budgets: [],
      savingsRatesByMonth: [0, 0.5, 0], // huge σ
    });
    expect(r.components.savings_consistency).toBe(0);
  });

  it("savings_consistency = 100 when rates are perfectly stable", () => {
    const r = computeDiscipline({
      budgets: [],
      savingsRatesByMonth: [0.15, 0.15, 0.15],
    });
    expect(r.components.savings_consistency).toBe(100);
  });

  it("score is clamped to 0-100", () => {
    const r = computeDiscipline({
      budgets: [
        { status: "OVER_LIMIT", percentage: 2.0 },
        { status: "OVER_LIMIT", percentage: 1.5 },
      ],
      savingsRatesByMonth: [0, 0.5, 0],
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("Profile B example (4/5 OK, 1 OVER)", () => {
    const r = computeDiscipline({
      budgets: [
        { status: "SUCCESS", percentage: 0.6 },
        { status: "SUCCESS", percentage: 0.5 },
        { status: "SUCCESS", percentage: 0.7 },
        { status: "SUCCESS", percentage: 0.65 },
        { status: "OVER_LIMIT", percentage: 1.05 }, // over but not critical
      ],
      savingsRatesByMonth: [0.33, 0.32, 0.34],
    });
    // budget_score = 80 (4/5 SUCCESS), no bonus (one at 1.05), no malus (not >1.2)
    // savings_consistency ≈ 99 (very stable)
    expect(r.components.budget_score).toBe(80);
    expect(r.components.budgets_success).toBe(4);
    expect(r.components.budgets_critical).toBe(0);
    expect(r.confidence).toBe("HIGH");
  });
});
