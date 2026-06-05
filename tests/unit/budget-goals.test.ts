import { describe, expect, it } from "vitest";
import {
  computeBudgetProgress,
  computeGoalAchievementScore,
  computePotentialSavings,
} from "@/lib/calculations/budget-goals";
import type { Opportunity } from "@/lib/calculations/opportunities";

// Phase 3.1.4 — budget-goals primitives. Each test pins one boundary
// so future edits to thresholds or status mapping fail loudly rather
// than silently shifting what users see as "respected" vs "over".

const NOW = new Date("2024-06-15T12:00:00.000Z");

function exp(p: {
  amount: number;
  category?: string;
  frequency?: string;
  created_at?: string;
}) {
  return {
    amount: p.amount,
    category: p.category ?? "food",
    frequency: p.frequency ?? "one_time",
    created_at: p.created_at ?? "2024-06-10T08:00:00.000Z",
  };
}

describe("computeBudgetProgress — per-category goal progress", () => {
  it("returns [] when no budgets are configured", () => {
    expect(computeBudgetProgress([], [], NOW)).toEqual([]);
  });

  it("maps a single under-budget category to SUCCESS with positive remaining", () => {
    const out = computeBudgetProgress(
      [{ category: "food", monthly_limit: 600 }],
      [exp({ amount: 420, category: "food" })],
      NOW,
    );
    expect(out).toHaveLength(1);
    const row = out[0];
    expect(row.category).toBe("food");
    expect(row.targetAmount).toBe(600);
    expect(row.currentSpent).toBe(420);
    expect(row.remaining).toBe(180);
    expect(row.overrun).toBe(0);
    expect(row.percentage).toBeCloseTo(0.7, 5);
    expect(row.status).toBe("SUCCESS");
  });

  it("flips to WARNING at exactly 80% of the limit", () => {
    const out = computeBudgetProgress(
      [{ category: "food", monthly_limit: 600 }],
      [exp({ amount: 480, category: "food" })],
      NOW,
    );
    expect(out[0].status).toBe("WARNING");
    expect(out[0].percentage).toBeCloseTo(0.8, 5);
  });

  it("stays WARNING just under 100%", () => {
    const out = computeBudgetProgress(
      [{ category: "food", monthly_limit: 600 }],
      [exp({ amount: 599, category: "food" })],
      NOW,
    );
    expect(out[0].status).toBe("WARNING");
  });

  it("treats exact-budget hit (100%) as WARNING, not OVER_LIMIT", () => {
    const out = computeBudgetProgress(
      [{ category: "food", monthly_limit: 600 }],
      [exp({ amount: 600, category: "food" })],
      NOW,
    );
    expect(out[0].status).toBe("WARNING");
    expect(out[0].remaining).toBe(0);
    expect(out[0].overrun).toBe(0);
  });

  it("crosses to OVER_LIMIT above 100% with positive overrun + negative remaining", () => {
    const out = computeBudgetProgress(
      [{ category: "leisure", monthly_limit: 300 }],
      [exp({ amount: 410, category: "leisure" })],
      NOW,
    );
    const row = out[0];
    expect(row.status).toBe("OVER_LIMIT");
    expect(row.currentSpent).toBe(410);
    expect(row.remaining).toBe(-110);
    expect(row.overrun).toBe(110);
    expect(row.percentage).toBeCloseTo(410 / 300, 5);
  });

  it("computes one row per budget, in input order", () => {
    const out = computeBudgetProgress(
      [
        { category: "food", monthly_limit: 600 },
        { category: "leisure", monthly_limit: 300 },
        { category: "transport", monthly_limit: 200 },
      ],
      [
        exp({ amount: 420, category: "food" }),
        exp({ amount: 410, category: "leisure" }),
        // transport: nothing spent
      ],
      NOW,
    );
    expect(out.map((r) => r.category)).toEqual([
      "food",
      "leisure",
      "transport",
    ]);
    expect(out[2].status).toBe("SUCCESS");
    expect(out[2].currentSpent).toBe(0);
    expect(out[2].remaining).toBe(200);
  });

  it("guards against a zero-target budget (defensive division)", () => {
    const out = computeBudgetProgress(
      [{ category: "food", monthly_limit: 0 }],
      [exp({ amount: 50, category: "food" })],
      NOW,
    );
    // currentSpent=50, target=0 → percentage stays 0 (not Infinity).
    expect(out[0].percentage).toBe(0);
    expect(out[0].status).toBe("SUCCESS");
  });
});

describe("computeGoalAchievementScore", () => {
  it("returns 0 / 0 / 0 on empty input — no false 100%", () => {
    expect(computeGoalAchievementScore([])).toEqual({
      respected: 0,
      total: 0,
      score: 0,
    });
  });

  it("counts only SUCCESS as respected (WARNING and OVER_LIMIT both count as not respected)", () => {
    const out = computeGoalAchievementScore([
      {
        category: "food",
        targetAmount: 600,
        currentSpent: 420,
        remaining: 180,
        overrun: 0,
        percentage: 0.7,
        status: "SUCCESS",
      },
      {
        category: "leisure",
        targetAmount: 300,
        currentSpent: 410,
        remaining: -110,
        overrun: 110,
        percentage: 1.37,
        status: "OVER_LIMIT",
      },
      {
        category: "transport",
        targetAmount: 200,
        currentSpent: 175,
        remaining: 25,
        overrun: 0,
        percentage: 0.875,
        status: "WARNING",
      },
      {
        category: "shopping",
        targetAmount: 150,
        currentSpent: 50,
        remaining: 100,
        overrun: 0,
        percentage: 0.33,
        status: "SUCCESS",
      },
    ]);
    expect(out.respected).toBe(2);
    expect(out.total).toBe(4);
    expect(out.score).toBe(0.5);
  });

  it("returns 1.0 when every budget is SUCCESS", () => {
    const out = computeGoalAchievementScore([
      {
        category: "food",
        targetAmount: 600,
        currentSpent: 200,
        remaining: 400,
        overrun: 0,
        percentage: 0.33,
        status: "SUCCESS",
      },
      {
        category: "transport",
        targetAmount: 200,
        currentSpent: 50,
        remaining: 150,
        overrun: 0,
        percentage: 0.25,
        status: "SUCCESS",
      },
    ]);
    expect(out.score).toBe(1);
    expect(out.respected).toBe(2);
    expect(out.total).toBe(2);
  });
});

describe("computePotentialSavings — aggregate impact", () => {
  function mkOp(
    priority: Opportunity["priority"],
    monthly: number,
    kind: Opportunity["kind"] = "budget_over",
  ): Opportunity {
    return {
      kind,
      priority,
      payload: {},
      monthlyImpact: monthly,
      yearlyImpact: monthly * 12,
      action: "x",
    };
  }

  it("returns zeros for an empty list", () => {
    const out = computePotentialSavings([]);
    expect(out.monthly).toBe(0);
    expect(out.yearly).toBe(0);
    expect(out.byPriority.high.monthly).toBe(0);
    expect(out.byPriority.medium.monthly).toBe(0);
    expect(out.byPriority.low.monthly).toBe(0);
  });

  it("sums monthly + yearly across all opportunities", () => {
    const out = computePotentialSavings([
      mkOp("high", 200),
      mkOp("medium", 100),
      mkOp("low", 50),
    ]);
    expect(out.monthly).toBe(350);
    expect(out.yearly).toBe(4200);
  });

  it("groups impact by priority", () => {
    const out = computePotentialSavings([
      mkOp("high", 200),
      mkOp("high", 60),
      mkOp("medium", 100),
      mkOp("low", 50),
    ]);
    expect(out.byPriority.high).toEqual({ monthly: 260, yearly: 3120 });
    expect(out.byPriority.medium).toEqual({ monthly: 100, yearly: 1200 });
    expect(out.byPriority.low).toEqual({ monthly: 50, yearly: 600 });
  });
});
