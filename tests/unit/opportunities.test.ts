import { describe, expect, it } from "vitest";
import { detectOpportunities } from "@/lib/calculations/opportunities";
import type {
  BudgetStatusRow,
  CategoryBreakdownRow,
} from "@/lib/calculations/analytics";

// Phase 3.1.3 — opportunities engine. Lock the heuristics so a
// future refactor doesn't accidentally lower the threshold and start
// spamming the user, or raise it and leave clear over-spending
// unsurfaced.

function baseInput(over: Partial<Parameters<typeof detectOpportunities>[0]> = {}) {
  return {
    expenseBuckets: { fixed: 0, variable: 0, total: 0, transactions: 0 },
    budgetStatus: [] as BudgetStatusRow[],
    categoryBreakdown: [] as CategoryBreakdownRow[],
    monthlyIncome: 6000,
    runwayMonths: 6,
    ...over,
  };
}

describe("detectOpportunities — budget overruns", () => {
  it("surfaces an entry per over-budget category, sorted by overshoot", () => {
    const out = detectOpportunities(
      baseInput({
        budgetStatus: [
          {
            category: "leisure",
            spent: 310,
            limit: 250,
            ratio: 1.24,
            status: "over",
            remaining: -60,
          },
          {
            category: "food",
            spent: 800,
            limit: 600,
            ratio: 1.33,
            status: "over",
            remaining: -200,
          },
        ],
      }),
    );
    const overs = out.filter((o) => o.kind === "budget_over");
    expect(overs).toHaveLength(2);
    // Most negative remaining (= biggest overshoot) comes first.
    expect(overs[0].payload.category).toBe("food");
    expect(overs[0].monthlyImpact).toBe(200);
    expect(overs[0].priority).toBe("high"); // >20% overshoot
    expect(overs[1].payload.category).toBe("leisure");
    // 60 / 250 = 24% overshoot — also above the 20% high threshold.
    expect(overs[1].priority).toBe("high");
  });

  it("caps overruns at 2 entries so a busy user isn't drowned", () => {
    const overs: BudgetStatusRow[] = Array.from({ length: 8 }, (_, i) => ({
      category: `cat_${i}`,
      spent: 200,
      limit: 100,
      ratio: 2,
      status: "over",
      remaining: -100,
    }));
    const out = detectOpportunities(baseInput({ budgetStatus: overs }));
    expect(out.filter((o) => o.kind === "budget_over")).toHaveLength(2);
  });
});

describe("detectOpportunities — variable / fixed share", () => {
  it("flags variable > 25% of income", () => {
    const out = detectOpportunities(
      baseInput({
        expenseBuckets: { fixed: 0, variable: 1800, total: 1800, transactions: 4 },
        monthlyIncome: 6000,
      }),
    );
    const op = out.find((o) => o.kind === "high_variable_share");
    expect(op).toBeDefined();
    expect(op?.payload.share).toBe(30); // 1800/6000 = 30%
    // Bringing it to 15 % → free 1800 - 900 = 900.
    expect(op?.monthlyImpact).toBe(900);
  });

  it("does NOT flag variable share below threshold (20%)", () => {
    const out = detectOpportunities(
      baseInput({
        expenseBuckets: { fixed: 0, variable: 1200, total: 1200, transactions: 4 },
        monthlyIncome: 6000,
      }),
    );
    expect(out.find((o) => o.kind === "high_variable_share")).toBeUndefined();
  });

  it("flags fixed > 60% of income", () => {
    const out = detectOpportunities(
      baseInput({
        expenseBuckets: { fixed: 4200, variable: 0, total: 4200, transactions: 0 },
        monthlyIncome: 6000,
      }),
    );
    expect(out.find((o) => o.kind === "high_fixed_ratio")).toBeDefined();
  });
});

describe("detectOpportunities — emergency fund", () => {
  it("priority HIGH when runway < 1 month", () => {
    const out = detectOpportunities(baseInput({ runwayMonths: 0.5 }));
    const op = out.find((o) => o.kind === "low_emergency_fund");
    expect(op?.priority).toBe("high");
  });

  it("priority MEDIUM when runway between 1 and 3 months", () => {
    const out = detectOpportunities(baseInput({ runwayMonths: 1.5 }));
    const op = out.find((o) => o.kind === "low_emergency_fund");
    expect(op?.priority).toBe("medium");
  });

  it("no opportunity when runway >= 3 months", () => {
    const out = detectOpportunities(baseInput({ runwayMonths: 6 }));
    expect(out.find((o) => o.kind === "low_emergency_fund")).toBeUndefined();
  });
});

describe("detectOpportunities — Swiss audit levers", () => {
  it("flags insurance share > 7% of income", () => {
    const out = detectOpportunities(
      baseInput({
        categoryBreakdown: [
          {
            category: "insurance",
            total: 500,
            transactions: 0,
            share: 0.1,
          },
        ],
        monthlyIncome: 6000,
      }),
    );
    expect(out.find((o) => o.kind === "high_insurance_share")).toBeDefined();
  });

  it("flags subscriptions share > 4% of income with halved impact", () => {
    const out = detectOpportunities(
      baseInput({
        categoryBreakdown: [
          {
            category: "subscriptions",
            total: 300,
            transactions: 0,
            share: 0.06,
          },
        ],
        monthlyIncome: 6000,
      }),
    );
    const op = out.find((o) => o.kind === "high_subscriptions_share");
    expect(op).toBeDefined();
    // 300 * 0.5 = 150 monthly impact.
    expect(op?.monthlyImpact).toBe(150);
    expect(op?.yearlyImpact).toBe(1800);
  });
});

describe("detectOpportunities — ordering and cap", () => {
  it("returns at most MAX_OPPORTUNITIES (5)", () => {
    const out = detectOpportunities(
      baseInput({
        expenseBuckets: { fixed: 4500, variable: 1800, total: 6300, transactions: 4 },
        monthlyIncome: 6000,
        runwayMonths: 0.5,
        budgetStatus: [
          {
            category: "leisure",
            spent: 310,
            limit: 250,
            ratio: 1.24,
            status: "over",
            remaining: -60,
          },
          {
            category: "food",
            spent: 800,
            limit: 600,
            ratio: 1.33,
            status: "over",
            remaining: -200,
          },
        ],
        categoryBreakdown: [
          { category: "insurance", total: 500, transactions: 0, share: 0.08 },
          { category: "subscriptions", total: 300, transactions: 0, share: 0.05 },
          { category: "food", total: 800, transactions: 4, share: 0.2 },
        ],
      }),
    );
    expect(out.length).toBeLessThanOrEqual(5);
    // High priority items come first.
    expect(out[0].priority).toBe("high");
  });
});
