import { describe, expect, it } from "vitest";
import { computeTrajectoire } from "@/lib/calculations/health/axes/trajectoire";

describe("computeTrajectoire", () => {
  it("returns UNKNOWN when no income at all", () => {
    const r = computeTrajectoire({
      monthlyIncome: 0,
      monthlyExpensesFixed: 1000,
      history3mIncomeAvg: null,
      incomeHistoryMonths: 0,
    });
    expect(r.confidence).toBe("UNKNOWN");
    expect(r.score).toBe(0);
  });

  it("uses 3-month average when available", () => {
    const r = computeTrajectoire({
      monthlyIncome: 8000, // exceptional month
      monthlyExpensesFixed: 3000,
      history3mIncomeAvg: 5000, // historical average
      incomeHistoryMonths: 3,
    });
    // savings_rate based on 5000 = (5000 - 3000) / 5000 = 0.4
    expect(r.components.savings_rate).toBeCloseTo(0.4, 2);
    // 0.4 × 400 = 160 → clamp 100
    expect(r.score).toBe(100);
    expect(r.components.income_used).toBe(5000);
  });

  it("falls back to current month income when no history", () => {
    const r = computeTrajectoire({
      monthlyIncome: 4000,
      monthlyExpensesFixed: 3600,
      history3mIncomeAvg: null,
      incomeHistoryMonths: 0,
    });
    expect(r.components.income_used).toBe(4000);
    // (4000-3600)/4000 = 0.10 → 40
    expect(r.score).toBe(40);
  });

  it("score 0 on deficit (negative savings rate clamped)", () => {
    const r = computeTrajectoire({
      monthlyIncome: 3000,
      monthlyExpensesFixed: 3500,
      history3mIncomeAvg: null,
      incomeHistoryMonths: 1,
    });
    expect(r.score).toBe(0);
    expect(r.components.savings_rate).toBeLessThan(0);
  });

  it("saturates at savings rate 25 %", () => {
    const r = computeTrajectoire({
      monthlyIncome: 4000,
      monthlyExpensesFixed: 3000, // 25 %
      history3mIncomeAvg: null,
      incomeHistoryMonths: 2,
    });
    expect(r.score).toBe(100);
  });

  it("Profile B example — 33 % savings rate", () => {
    const r = computeTrajectoire({
      monthlyIncome: 12000,
      monthlyExpensesFixed: 8000,
      history3mIncomeAvg: 12000,
      incomeHistoryMonths: 3,
    });
    expect(r.components.savings_rate).toBeCloseTo(0.333, 2);
    expect(r.score).toBe(100);
    expect(r.confidence).toBe("HIGH");
  });

  it("MEDIUM confidence with only 1 month of history", () => {
    const r = computeTrajectoire({
      monthlyIncome: 4000,
      monthlyExpensesFixed: 3000,
      history3mIncomeAvg: null,
      incomeHistoryMonths: 1,
    });
    expect(r.confidence).toBe("MEDIUM");
  });

  it("LOW confidence when income known but no fixed expenses declared", () => {
    const r = computeTrajectoire({
      monthlyIncome: 4000,
      monthlyExpensesFixed: 0,
      history3mIncomeAvg: null,
      incomeHistoryMonths: 3,
    });
    expect(r.confidence).toBe("LOW");
  });

  it("Profile F — median user (8 % savings)", () => {
    const r = computeTrajectoire({
      monthlyIncome: 4200,
      monthlyExpensesFixed: 3850,
      history3mIncomeAvg: 4200,
      incomeHistoryMonths: 3,
    });
    expect(r.components.savings_rate).toBeCloseTo(0.083, 2);
    expect(r.score).toBeGreaterThanOrEqual(32);
    expect(r.score).toBeLessThanOrEqual(34);
  });
});
