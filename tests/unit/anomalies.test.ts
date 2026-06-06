import { describe, expect, it } from "vitest";
import { detectAnomalies } from "@/lib/calculations/anomalies";
import type { Expense } from "@/types/database";

// Phase 3.1.6 — anomaly detection. Lock the thresholds and the
// "don't double-flag housing" coordination rule.

function exp(p: Partial<Expense> & { category: string; amount: number }): Expense {
  return {
    id: p.id ?? `e-${p.category}-${p.amount}`,
    user_id: p.user_id ?? "u-1",
    label: p.label ?? p.category,
    amount: p.amount,
    category: p.category,
    frequency: p.frequency ?? "monthly",
    notes: p.notes ?? null,
    created_at: p.created_at ?? "2024-06-01T00:00:00Z",
    updated_at: p.updated_at ?? "2024-06-01T00:00:00Z",
  };
}

const ZERO_BUCKETS = { fixed: 0, variable: 0, total: 0, transactions: 0 };

describe("detectAnomalies — housing > 50% of income", () => {
  it("flags warning when housing is > 50% of income", () => {
    const out = detectAnomalies({
      expenses: [exp({ category: "housing", amount: 3500 })],
      expenseBuckets: { fixed: 3500, variable: 0, total: 3500, transactions: 0 },
      monthlyIncome: 6000,
      currentSavings: 0,
      runwayMonths: 2,
    });
    const a = out.find((x) => x.kind === "housing_over_50pct_income");
    expect(a).toBeDefined();
    expect(a?.severity).toBe("warning");
    expect(a?.payload.ratio).toBeCloseTo(58.33, 1);
  });

  it("does NOT flag when housing is at or under 50%", () => {
    const out = detectAnomalies({
      expenses: [exp({ category: "housing", amount: 2500 })],
      expenseBuckets: { fixed: 2500, variable: 0, total: 2500, transactions: 0 },
      monthlyIncome: 6000,
      currentSavings: 0,
      runwayMonths: 6,
    });
    expect(out.find((x) => x.kind === "housing_over_50pct_income")).toBeUndefined();
  });
});

describe("detectAnomalies — single category > 80% of expenses", () => {
  it("flags warning when one category takes > 80% of total spending", () => {
    const out = detectAnomalies({
      expenses: [
        exp({ category: "housing", amount: 4500 }),
        exp({ category: "food", amount: 100 }),
      ],
      expenseBuckets: { fixed: 4600, variable: 0, total: 4600, transactions: 0 },
      monthlyIncome: 10000,
      currentSavings: 0,
      runwayMonths: 6,
    });
    const a = out.find((x) => x.kind === "single_category_over_80pct");
    expect(a).toBeDefined();
    expect(a?.payload.category).toBe("housing");
    expect(a?.payload.share).toBeGreaterThan(80);
  });

  it("does NOT flag balanced spending below the threshold", () => {
    const out = detectAnomalies({
      expenses: [
        exp({ category: "housing", amount: 1500 }),
        exp({ category: "food", amount: 800 }),
        exp({ category: "transport", amount: 400 }),
      ],
      expenseBuckets: { fixed: 2700, variable: 0, total: 2700, transactions: 0 },
      monthlyIncome: 6000,
      currentSavings: 0,
      runwayMonths: 6,
    });
    expect(out.find((x) => x.kind === "single_category_over_80pct")).toBeUndefined();
  });
});

describe("detectAnomalies — unusually high one-time transaction", () => {
  it("flags an outlier > 3× median AND > 500 absolute", () => {
    const out = detectAnomalies({
      expenses: [
        exp({ category: "food", amount: 30, frequency: "one_time", label: "Coop" }),
        exp({ category: "food", amount: 40, frequency: "one_time", label: "Migros" }),
        exp({ category: "food", amount: 50, frequency: "one_time", label: "Lidl" }),
        exp({ category: "shopping", amount: 1800, frequency: "one_time", label: "iPhone" }),
      ],
      expenseBuckets: { fixed: 0, variable: 1920, total: 1920, transactions: 4 },
      monthlyIncome: 6000,
      currentSavings: 0,
      runwayMonths: 6,
    });
    const a = out.find((x) => x.kind === "unusual_high_one_time");
    expect(a).toBeDefined();
    expect(a?.payload.label).toBe("iPhone");
    expect(a?.severity).toBe("info");
  });

  it("does NOT flag a moderate over-median value below the 500 absolute floor", () => {
    const out = detectAnomalies({
      expenses: [
        exp({ category: "food", amount: 10, frequency: "one_time" }),
        exp({ category: "food", amount: 12, frequency: "one_time" }),
        exp({ category: "food", amount: 50, frequency: "one_time" }),
      ],
      expenseBuckets: { fixed: 0, variable: 72, total: 72, transactions: 3 },
      monthlyIncome: 6000,
      currentSavings: 0,
      runwayMonths: 6,
    });
    expect(out.find((x) => x.kind === "unusual_high_one_time")).toBeUndefined();
  });

  it("needs at least 3 one-time entries to compute a median", () => {
    const out = detectAnomalies({
      expenses: [
        exp({ category: "shopping", amount: 1500, frequency: "one_time" }),
        exp({ category: "shopping", amount: 50, frequency: "one_time" }),
      ],
      expenseBuckets: { fixed: 0, variable: 1550, total: 1550, transactions: 2 },
      monthlyIncome: 6000,
      currentSavings: 0,
      runwayMonths: 6,
    });
    expect(out.find((x) => x.kind === "unusual_high_one_time")).toBeUndefined();
  });
});

describe("detectAnomalies — fixed-expense outlier", () => {
  it("flags a typo-like 'monthly 4000' subscription on a 6000 income", () => {
    const out = detectAnomalies({
      expenses: [exp({ category: "subscriptions", amount: 4000, label: "Netflix?" })],
      expenseBuckets: { fixed: 4000, variable: 0, total: 4000, transactions: 0 },
      monthlyIncome: 6000,
      currentSavings: 0,
      runwayMonths: 6,
    });
    const a = out.find((x) => x.kind === "fixed_expense_outlier");
    expect(a).toBeDefined();
    expect(a?.payload.category).toBe("subscriptions");
    expect(a?.severity).toBe("info");
  });

  it("does NOT flag housing (rule 1 handles it, avoids double-flagging)", () => {
    const out = detectAnomalies({
      expenses: [exp({ category: "housing", amount: 4000 })],
      expenseBuckets: { fixed: 4000, variable: 0, total: 4000, transactions: 0 },
      monthlyIncome: 6000,
      currentSavings: 0,
      runwayMonths: 6,
    });
    expect(out.find((x) => x.kind === "fixed_expense_outlier")).toBeUndefined();
    expect(out.find((x) => x.kind === "housing_over_50pct_income")).toBeDefined();
  });
});

describe("detectAnomalies — high income + thin emergency fund", () => {
  it("flags when income > 8000 AND runway < 1 month", () => {
    const out = detectAnomalies({
      expenses: [],
      expenseBuckets: ZERO_BUCKETS,
      monthlyIncome: 12000,
      currentSavings: 500,
      runwayMonths: 0.5,
    });
    const a = out.find((x) => x.kind === "high_income_low_emergency");
    expect(a).toBeDefined();
    expect(a?.severity).toBe("info");
  });

  it("does NOT flag if income is below 8000 even with thin runway", () => {
    const out = detectAnomalies({
      expenses: [],
      expenseBuckets: ZERO_BUCKETS,
      monthlyIncome: 5000,
      currentSavings: 100,
      runwayMonths: 0.5,
    });
    expect(out.find((x) => x.kind === "high_income_low_emergency")).toBeUndefined();
  });

  it("does NOT flag if runway >= 1 month even with high income", () => {
    const out = detectAnomalies({
      expenses: [],
      expenseBuckets: ZERO_BUCKETS,
      monthlyIncome: 12000,
      currentSavings: 5000,
      runwayMonths: 2,
    });
    expect(out.find((x) => x.kind === "high_income_low_emergency")).toBeUndefined();
  });
});

describe("detectAnomalies — ordering and cap", () => {
  it("never returns more than MAX_ANOMALIES (5)", () => {
    // Construct a worst-case profile that fires every rule.
    const out = detectAnomalies({
      expenses: [
        exp({ category: "housing", amount: 5000 }),
        exp({ category: "subscriptions", amount: 4000, label: "X" }),
        exp({ category: "food", amount: 30, frequency: "one_time" }),
        exp({ category: "food", amount: 40, frequency: "one_time" }),
        exp({ category: "food", amount: 2000, frequency: "one_time", label: "Vacances" }),
      ],
      expenseBuckets: { fixed: 9000, variable: 2070, total: 11070, transactions: 3 },
      monthlyIncome: 9000,
      currentSavings: 100,
      runwayMonths: 0.5,
    });
    expect(out.length).toBeLessThanOrEqual(5);
    // Warnings come first.
    expect(out[0].severity).toBe("warning");
  });
});
