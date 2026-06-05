import { describe, expect, it } from "vitest";
import {
  buildBudgetStatus,
  buildCategoryBreakdown,
  computePeriodTotals,
  getPeriodWindow,
} from "@/lib/calculations/analytics";

// Phase 3.1.2 — analytics primitives. These tests pin the period
// window boundaries (week / month / year / 12 months) and the
// per-period totals so the new /expenses/analytics page never drifts
// from the dashboard's "this month" headline numbers.

const NOW = new Date("2024-06-15T12:00:00.000Z"); // Saturday

function exp(p: {
  amount: number;
  category?: string;
  frequency?: string;
  created_at?: string;
}) {
  return {
    amount: p.amount,
    category: p.category ?? "food",
    frequency: p.frequency ?? "monthly",
    created_at: p.created_at ?? "2024-06-10T08:00:00.000Z",
  };
}

describe("getPeriodWindow — UTC, ISO-week-Monday-start", () => {
  it("week window starts on Monday 00:00 UTC", () => {
    const w = getPeriodWindow("week", NOW);
    expect(new Date(w.start).toISOString()).toBe("2024-06-10T00:00:00.000Z");
    expect(new Date(w.end).toISOString()).toBe("2024-06-17T00:00:00.000Z");
  });

  it("month window is the calendar UTC month", () => {
    const w = getPeriodWindow("month", NOW);
    expect(new Date(w.start).toISOString()).toBe("2024-06-01T00:00:00.000Z");
    expect(new Date(w.end).toISOString()).toBe("2024-07-01T00:00:00.000Z");
  });

  it("year window is the calendar UTC year", () => {
    const w = getPeriodWindow("year", NOW);
    expect(new Date(w.start).toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(new Date(w.end).toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("twelve_months window ends at next month boundary", () => {
    const w = getPeriodWindow("twelve_months", NOW);
    expect(new Date(w.start).toISOString()).toBe("2023-07-01T00:00:00.000Z");
    expect(new Date(w.end).toISOString()).toBe("2024-07-01T00:00:00.000Z");
  });
});

describe("computePeriodTotals", () => {
  it("scales recurring across the window length (12 months ≈ 12×monthly)", () => {
    const r = computePeriodTotals(
      [exp({ amount: 1500, frequency: "monthly" })],
      "twelve_months",
      NOW,
    );
    expect(r.fixed).toBeCloseTo(18000, 0);
    expect(r.variable).toBe(0);
    expect(r.transactions).toBe(0);
  });

  it("for the current month matches Phase 3.1.1 buckets to the cent", () => {
    const r = computePeriodTotals(
      [
        exp({ amount: 1500, frequency: "monthly" }),
        exp({
          amount: 42,
          frequency: "one_time",
          created_at: "2024-06-10T10:00:00.000Z",
        }),
      ],
      "month",
      NOW,
    );
    expect(r.fixed).toBeCloseTo(1500, 5);
    expect(r.variable).toBe(42);
    expect(r.total).toBeCloseTo(1542, 5);
    expect(r.transactions).toBe(1);
  });

  it("excludes out-of-window one_time entries", () => {
    const r = computePeriodTotals(
      [
        exp({
          amount: 99,
          frequency: "one_time",
          created_at: "2024-06-01T00:00:00.000Z",
        }),
      ],
      "week",
      NOW,
    );
    expect(r.variable).toBe(0);
  });
});

describe("buildCategoryBreakdown", () => {
  const cats = ["food", "transport", "leisure"];

  it("returns every requested category even at 0", () => {
    const rows = buildCategoryBreakdown(
      [],
      "month",
      cats,
      NOW,
    );
    expect(rows.map((r) => r.category).sort()).toEqual([
      "food",
      "leisure",
      "transport",
    ]);
    for (const r of rows) {
      expect(r.total).toBe(0);
      expect(r.share).toBe(0);
    }
  });

  it("computes share over the grand total only", () => {
    const rows = buildCategoryBreakdown(
      [
        exp({ amount: 100, category: "food", frequency: "monthly" }),
        exp({ amount: 300, category: "transport", frequency: "monthly" }),
      ],
      "month",
      cats,
      NOW,
    );
    const food = rows.find((r) => r.category === "food")!;
    const transport = rows.find((r) => r.category === "transport")!;
    expect(food.share).toBeCloseTo(0.25, 5);
    expect(transport.share).toBeCloseTo(0.75, 5);
  });

  it("sorts by total descending so the chart reads correctly", () => {
    const rows = buildCategoryBreakdown(
      [
        exp({ amount: 100, category: "food", frequency: "monthly" }),
        exp({ amount: 300, category: "transport", frequency: "monthly" }),
        exp({ amount: 50, category: "leisure", frequency: "monthly" }),
      ],
      "month",
      cats,
      NOW,
    );
    expect(rows.map((r) => r.category)).toEqual([
      "transport",
      "food",
      "leisure",
    ]);
  });

  it("counts one_time transactions per category", () => {
    const rows = buildCategoryBreakdown(
      [
        exp({
          amount: 42,
          category: "food",
          frequency: "one_time",
          created_at: "2024-06-10T10:00:00.000Z",
        }),
        exp({
          amount: 68,
          category: "food",
          frequency: "one_time",
          created_at: "2024-06-12T10:00:00.000Z",
        }),
      ],
      "month",
      cats,
      NOW,
    );
    const food = rows.find((r) => r.category === "food")!;
    expect(food.total).toBe(110);
    expect(food.transactions).toBe(2);
  });
});

describe("buildBudgetStatus", () => {
  it("returns [] when no budgets are configured", () => {
    expect(
      buildBudgetStatus(
        [exp({ amount: 100, category: "food", frequency: "monthly" })],
        [],
        NOW,
      ),
    ).toEqual([]);
  });

  it("classifies ok / warning / over from spent/limit ratio", () => {
    const rows = buildBudgetStatus(
      [
        exp({
          amount: 200,
          category: "food",
          frequency: "one_time",
          created_at: "2024-06-10T10:00:00.000Z",
        }),
        exp({
          amount: 220,
          category: "food",
          frequency: "one_time",
          created_at: "2024-06-12T10:00:00.000Z",
        }),
        exp({
          amount: 310,
          category: "leisure",
          frequency: "one_time",
          created_at: "2024-06-12T10:00:00.000Z",
        }),
      ],
      [
        { category: "food", monthly_limit: 600 },
        { category: "leisure", monthly_limit: 250 },
        { category: "transport", monthly_limit: 200 },
      ],
      NOW,
    );
    const food = rows.find((r) => r.category === "food")!;
    expect(food.spent).toBe(420);
    expect(food.status).toBe("ok");
    expect(food.remaining).toBe(180);
    const leisure = rows.find((r) => r.category === "leisure")!;
    expect(leisure.spent).toBe(310);
    expect(leisure.status).toBe("over");
    expect(leisure.remaining).toBe(-60);
    const transport = rows.find((r) => r.category === "transport")!;
    expect(transport.spent).toBe(0);
    expect(transport.status).toBe("ok");
  });

  it("flags warning at 80% of the limit", () => {
    const rows = buildBudgetStatus(
      [
        exp({
          amount: 480,
          category: "food",
          frequency: "one_time",
          created_at: "2024-06-10T10:00:00.000Z",
        }),
      ],
      [{ category: "food", monthly_limit: 600 }],
      NOW,
    );
    expect(rows[0].status).toBe("warning");
  });
});
