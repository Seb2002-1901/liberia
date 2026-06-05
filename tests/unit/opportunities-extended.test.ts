import { describe, expect, it } from "vitest";
import { detectOpportunities } from "@/lib/calculations/opportunities";
import type {
  BudgetStatusRow,
  CategoryBreakdownRow,
} from "@/lib/calculations/analytics";

// Phase 3.1.4 — extended opportunities: `dominant_category`,
// `low_savings_rate` + every existing opportunity gets an `action`
// field for the i18n CTA. These tests pin the new boundaries and
// guarantee EVERY rule emits an action string (the UI relies on it).

function baseInput(over: Partial<Parameters<typeof detectOpportunities>[0]> = {}) {
  return {
    expenseBuckets: { fixed: 0, variable: 0, total: 0, transactions: 0 },
    budgetStatus: [] as BudgetStatusRow[],
    categoryBreakdown: [] as CategoryBreakdownRow[],
    monthlyIncome: 6000,
    runwayMonths: 6,
    savingsRate: 0.2,
    ...over,
  };
}

describe("detectOpportunities — every emitted Opportunity carries an action", () => {
  it("every output has a non-empty `action` field — UI depends on it", () => {
    const out = detectOpportunities(
      baseInput({
        expenseBuckets: { fixed: 4500, variable: 1800, total: 6300, transactions: 4 },
        monthlyIncome: 6000,
        runwayMonths: 0.5,
        savingsRate: 0,
        budgetStatus: [
          {
            category: "leisure",
            spent: 310,
            limit: 250,
            ratio: 1.24,
            status: "over",
            remaining: -60,
          },
        ],
        categoryBreakdown: [
          { category: "housing", total: 4000, transactions: 0, share: 0.6 },
          { category: "insurance", total: 500, transactions: 0, share: 0.08 },
          { category: "subscriptions", total: 300, transactions: 0, share: 0.05 },
        ],
      }),
    );
    expect(out.length).toBeGreaterThan(0);
    for (const op of out) {
      expect(typeof op.action).toBe("string");
      expect(op.action.length).toBeGreaterThan(0);
    }
  });
});

describe("detectOpportunities — dominant_category", () => {
  it("flags when a single category takes > 50% of total", () => {
    const out = detectOpportunities(
      baseInput({
        expenseBuckets: { fixed: 4000, variable: 0, total: 4000, transactions: 0 },
        categoryBreakdown: [
          { category: "housing", total: 2500, transactions: 0, share: 0.625 },
          { category: "food", total: 800, transactions: 0, share: 0.2 },
        ],
      }),
    );
    const op = out.find((o) => o.kind === "dominant_category");
    expect(op).toBeDefined();
    expect(op?.payload.category).toBe("housing");
    expect(op?.payload.share).toBe(62.5);
    // housing is structural → low priority, no quick monthly impact.
    expect(op?.priority).toBe("low");
    expect(op?.monthlyImpact).toBe(0);
    expect(op?.action).toBe("review_housing_costs");
  });

  it("does NOT flag when the top category sits below 50%", () => {
    const out = detectOpportunities(
      baseInput({
        expenseBuckets: { fixed: 4000, variable: 0, total: 4000, transactions: 0 },
        categoryBreakdown: [
          { category: "housing", total: 1800, transactions: 0, share: 0.45 },
        ],
      }),
    );
    expect(out.find((o) => o.kind === "dominant_category")).toBeUndefined();
  });

  it("treats non-housing dominant as MEDIUM priority with a 10% shave impact", () => {
    const out = detectOpportunities(
      baseInput({
        expenseBuckets: { fixed: 0, variable: 4000, total: 4000, transactions: 5 },
        categoryBreakdown: [
          { category: "leisure", total: 2200, transactions: 5, share: 0.55 },
        ],
      }),
    );
    const op = out.find((o) => o.kind === "dominant_category");
    expect(op?.priority).toBe("medium");
    expect(op?.monthlyImpact).toBe(220); // 2200 * 0.1
    expect(op?.yearlyImpact).toBe(2640);
  });
});

describe("detectOpportunities — low_savings_rate", () => {
  it("flags when savings rate < 5%, MEDIUM priority above 0", () => {
    const out = detectOpportunities(
      baseInput({ savingsRate: 0.02, monthlyIncome: 6000 }),
    );
    const op = out.find((o) => o.kind === "low_savings_rate");
    expect(op).toBeDefined();
    expect(op?.priority).toBe("medium");
    // Gap to 10% target = 0.08 * 6000 = 480.
    expect(op?.monthlyImpact).toBe(480);
    expect(op?.yearlyImpact).toBe(5760);
    expect(op?.action).toBe("automate_savings_transfer");
  });

  it("priority HIGH when savings rate is at or below zero", () => {
    const out = detectOpportunities(
      baseInput({ savingsRate: -0.05, monthlyIncome: 6000 }),
    );
    expect(out.find((o) => o.kind === "low_savings_rate")?.priority).toBe(
      "high",
    );
  });

  it("does NOT flag when savings rate >= 5%", () => {
    const out = detectOpportunities(
      baseInput({ savingsRate: 0.08, monthlyIncome: 6000 }),
    );
    expect(out.find((o) => o.kind === "low_savings_rate")).toBeUndefined();
  });

  it("skips silently when savingsRate is undefined (backwards compatible)", () => {
    const out = detectOpportunities(
      baseInput({ savingsRate: undefined, monthlyIncome: 6000 }),
    );
    expect(out.find((o) => o.kind === "low_savings_rate")).toBeUndefined();
  });
});
