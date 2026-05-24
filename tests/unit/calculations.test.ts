import { describe, expect, it } from "vitest";
import {
  calculateExpenseRatio,
  calculateFinancialStress,
  calculateNetCashflow,
  calculateRunway,
  calculateSavingsRate,
  calculateStabilityScore,
  getStabilityTier,
} from "@/lib/calculations/finance";
import {
  aggregateMonthlyByCategory,
  frequencyMultiplier,
} from "@/lib/calculations/aggregate";

describe("financial calculations", () => {
  describe("calculateNetCashflow", () => {
    it("returns income minus expenses", () => {
      expect(calculateNetCashflow({ monthlyIncome: 2000, monthlyExpenses: 1500 })).toBe(500);
    });
    it("returns negative when expenses > income", () => {
      expect(calculateNetCashflow({ monthlyIncome: 1000, monthlyExpenses: 1500 })).toBe(-500);
    });
    it("handles zero income", () => {
      expect(calculateNetCashflow({ monthlyIncome: 0, monthlyExpenses: 500 })).toBe(-500);
    });
  });

  describe("calculateSavingsRate", () => {
    it("returns 0 when income is 0 (no divide-by-zero)", () => {
      expect(calculateSavingsRate({ monthlyIncome: 0, monthlyExpenses: 100 })).toBe(0);
    });
    it("returns positive percentage when saving", () => {
      expect(calculateSavingsRate({ monthlyIncome: 2000, monthlyExpenses: 1500 })).toBe(25);
    });
    it("clamps to -100 when severely overspending", () => {
      expect(calculateSavingsRate({ monthlyIncome: 100, monthlyExpenses: 10_000 })).toBe(-100);
    });
  });

  describe("calculateExpenseRatio", () => {
    it("returns 100 when income is 0 (defensive)", () => {
      expect(calculateExpenseRatio({ monthlyIncome: 0, monthlyExpenses: 1000 })).toBe(100);
    });
    it("returns ratio in percent", () => {
      expect(calculateExpenseRatio({ monthlyIncome: 2000, monthlyExpenses: 1500 })).toBe(75);
    });
  });

  describe("calculateRunway", () => {
    it("returns Infinity when expenses are 0", () => {
      expect(calculateRunway({ currentSavings: 1000, monthlyExpenses: 0 })).toBe(Infinity);
    });
    it("returns months of coverage", () => {
      expect(calculateRunway({ currentSavings: 6000, monthlyExpenses: 2000 })).toBe(3);
    });
    it("never returns negative", () => {
      expect(
        calculateRunway({ currentSavings: -100, monthlyExpenses: 100 }),
      ).toBe(0);
    });
  });

  describe("calculateStabilityScore", () => {
    it("is bounded [0, 100]", () => {
      const inputs = [
        { monthlyIncome: 0, monthlyExpenses: 0, currentSavings: 0, hasEmergencyFund: false },
        { monthlyIncome: 100, monthlyExpenses: 5000, currentSavings: 0, hasEmergencyFund: false },
        { monthlyIncome: 10_000, monthlyExpenses: 1000, currentSavings: 100_000, hasEmergencyFund: true },
      ];
      for (const i of inputs) {
        const s = calculateStabilityScore(i);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    });
    it("rewards emergency fund", () => {
      const withFund = calculateStabilityScore({
        monthlyIncome: 2000,
        monthlyExpenses: 1500,
        currentSavings: 5000,
        hasEmergencyFund: true,
      });
      const without = calculateStabilityScore({
        monthlyIncome: 2000,
        monthlyExpenses: 1500,
        currentSavings: 5000,
        hasEmergencyFund: false,
      });
      expect(withFund).toBeGreaterThan(without);
    });
  });

  describe("calculateFinancialStress", () => {
    it("is bounded [0, 100]", () => {
      const s = calculateFinancialStress({
        perceivedStress: 5,
        expenseRatio: 200,
        runwayMonths: 0,
        cashflow: -1000,
      });
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    });
    it("handles Infinity runway", () => {
      const s = calculateFinancialStress({
        perceivedStress: 1,
        expenseRatio: 50,
        runwayMonths: Infinity,
        cashflow: 1000,
      });
      expect(Number.isFinite(s)).toBe(true);
    });
  });

  describe("getStabilityTier", () => {
    it("returns gold for >=80", () => {
      expect(getStabilityTier(85).color).toBe("gold");
    });
    it("returns danger for <20", () => {
      expect(getStabilityTier(10).color).toBe("danger");
    });
  });

  describe("aggregateMonthlyByCategory", () => {
    it("normalizes by frequency", () => {
      const out = aggregateMonthlyByCategory([
        { amount: 100, frequency: "monthly", category: "food" },
        { amount: 1200, frequency: "yearly", category: "food" }, // = 100/mo
        { amount: 20, frequency: "weekly", category: "transport" }, // ~86.67/mo
      ]);
      const food = out.find((r) => r.category === "food");
      const transport = out.find((r) => r.category === "transport");
      expect(food?.total).toBe(200);
      expect(transport?.total).toBeCloseTo((20 * 52) / 12, 2);
    });
    it("returns empty array for empty input", () => {
      expect(aggregateMonthlyByCategory([])).toEqual([]);
    });
  });

  describe("frequencyMultiplier", () => {
    it("knows monthly = 1", () => {
      expect(frequencyMultiplier("monthly")).toBe(1);
    });
    it("knows yearly = 1/12", () => {
      expect(frequencyMultiplier("yearly")).toBeCloseTo(1 / 12);
    });
    it("falls back to 1 for unknown", () => {
      expect(frequencyMultiplier("invalid")).toBe(1);
    });
  });
});
