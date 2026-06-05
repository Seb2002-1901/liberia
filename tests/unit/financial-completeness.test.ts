import { describe, expect, it } from "vitest";
import {
  COMPLETENESS_MAX_SCORE,
  computeFinancialCompleteness,
  detectMissingFinancialAreas,
  type CompletenessInput,
  type FinancialArea,
} from "@/lib/calculations/completeness";
import type {
  CategoryBudget,
  Expense,
  Goal,
  Income,
} from "@/types/database";

// Phase 3.1.5 — financial completeness. These tests pin the score
// barème, the per-area severity classification, the reliability
// thresholds, and the "missing sorted by severity" invariant so a
// future tweak to the weights doesn't silently change what the
// dashboard / coach surface to the user.

function exp(
  category: string,
  partial: Partial<Expense> = {},
): Expense {
  return {
    id: partial.id ?? `e-${category}`,
    user_id: partial.user_id ?? "u-1",
    label: partial.label ?? category,
    amount: partial.amount ?? 100,
    category,
    frequency: partial.frequency ?? "monthly",
    notes: partial.notes ?? null,
    created_at: partial.created_at ?? "2024-06-01T00:00:00Z",
    updated_at: partial.updated_at ?? "2024-06-01T00:00:00Z",
  };
}

function income(): Income {
  return {
    id: "i-1",
    user_id: "u-1",
    label: "Salaire",
    amount: 6000,
    category: "salary",
    frequency: "monthly",
    notes: null,
    created_at: "2024-06-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  };
}

function goal(): Goal {
  return {
    id: "g-1",
    user_id: "u-1",
    title: "Maison",
    type: "purchase",
    target_amount: 50000,
    current_amount: 0,
    deadline: null,
    notes: null,
    is_completed: false,
    created_at: "2024-06-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  };
}

function budget(): CategoryBudget {
  return {
    id: "b-1",
    user_id: "u-1",
    category: "food",
    monthly_limit: 600,
    currency: "CHF",
    created_at: "2024-06-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  };
}

function buildInput(p: Partial<CompletenessInput> = {}): CompletenessInput {
  return {
    incomes: p.incomes ?? [],
    expenses: p.expenses ?? [],
    goals: p.goals ?? [],
    categoryBudgets: p.categoryBudgets ?? [],
  };
}

describe("computeFinancialCompleteness — barème + boundaries", () => {
  it("returns 0 on an empty account, with every area missing", () => {
    const r = computeFinancialCompleteness(buildInput());
    expect(r.score).toBe(0);
    expect(r.detected).toEqual([]);
    expect(r.missing).toHaveLength(10);
    expect(r.reliability).toBe("low");
  });

  it("reaches 100 with every area present", () => {
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [
          exp("housing"),
          exp("food"),
          exp("insurance"),
          exp("transport"),
          exp("utilities"),
          exp("subscriptions"),
          exp("leisure"),
        ],
        goals: [goal()],
        categoryBudgets: [budget()],
      }),
    );
    expect(r.score).toBe(100);
    expect(r.missing).toEqual([]);
    expect(r.reliability).toBe("high");
    // detected must contain ALL 10 areas
    expect(r.detected).toHaveLength(10);
  });

  it("weights total exactly 100 — no over- or under-scoring possible", () => {
    expect(COMPLETENESS_MAX_SCORE).toBe(100);
  });

  it("treats the canonical 'rent + food + income' partial profile as ~40", () => {
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [exp("housing"), exp("food")],
      }),
    );
    // income 15 + housing 15 + food 10 = 40
    expect(r.score).toBe(40);
    expect(r.reliability).toBe("low");
  });

  it("the bug-case profile (rent + tiny food) lands well under 70", () => {
    // The brief's real-world example: only 3 areas covered.
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [
          exp("housing", { amount: 15000 }),
          exp("food", { frequency: "one_time" }),
        ],
      }),
    );
    expect(r.score).toBeLessThan(70);
    expect(r.reliability).toBe("low");
  });
});

describe("computeFinancialCompleteness — area mapping", () => {
  it("'telecom' maps to the 'utilities' expense category", () => {
    const withUtilities = computeFinancialCompleteness(
      buildInput({ expenses: [exp("utilities")] }),
    );
    expect(withUtilities.detected).toContain("telecom" as FinancialArea);
  });

  it("an EXPENSE_CATEGORIES id not in the barème (e.g. 'shopping') doesn't bump the score", () => {
    const r = computeFinancialCompleteness(
      buildInput({ expenses: [exp("shopping"), exp("health")] }),
    );
    expect(r.score).toBe(0);
    expect(r.detected).toEqual([]);
  });

  it("at least ONE entry per category counts — frequency / amount don't matter", () => {
    const r1 = computeFinancialCompleteness(
      buildInput({ expenses: [exp("insurance", { amount: 1 })] }),
    );
    const r2 = computeFinancialCompleteness(
      buildInput({
        expenses: [
          exp("insurance", { amount: 250, frequency: "monthly" }),
          exp("insurance", { amount: 100, frequency: "yearly" }),
        ],
      }),
    );
    expect(r1.score).toBe(r2.score);
    expect(r1.score).toBe(15); // insurance weight
  });
});

describe("computeFinancialCompleteness — reliability thresholds", () => {
  it("score 90+ → reliability 'high'", () => {
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [
          exp("housing"),
          exp("food"),
          exp("insurance"),
          exp("transport"),
          exp("utilities"),
          exp("subscriptions"),
          exp("leisure"),
        ],
        goals: [goal()],
      }),
    );
    // income 15 + housing 15 + food 10 + insurance 15 + transport 10
    //  + telecom 10 + subscriptions 10 + leisure 5 + goal 5 = 95
    expect(r.score).toBe(95);
    expect(r.reliability).toBe("high");
  });

  it("score 70-89 → reliability 'medium'", () => {
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [
          exp("housing"),
          exp("food"),
          exp("insurance"),
          exp("transport"),
          exp("utilities"),
        ],
      }),
    );
    // 15+15+10+15+10+10 = 75
    expect(r.score).toBe(75);
    expect(r.reliability).toBe("medium");
  });

  it("score just under 70 → 'low' (boundary is sharp)", () => {
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [
          exp("housing"),
          exp("food"),
          exp("insurance"),
          exp("transport"),
        ],
      }),
    );
    // 15+15+10+15+10 = 65
    expect(r.score).toBe(65);
    expect(r.reliability).toBe("low");
  });

  it("score exactly 70 → 'medium' (inclusive lower bound)", () => {
    // income 15 + housing 15 + food 10 + transport 10
    //  + telecom 10 + leisure 5 + goal 5 = 70
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [
          exp("housing"),
          exp("food"),
          exp("transport"),
          exp("utilities"),
          exp("leisure"),
        ],
        goals: [goal()],
      }),
    );
    expect(r.score).toBe(70);
    expect(r.reliability).toBe("medium");
  });
});

describe("computeFinancialCompleteness — missing severity", () => {
  it("marks insurance/income/housing missing as HIGH severity", () => {
    const r = computeFinancialCompleteness(buildInput());
    const high = r.missing.filter((m) => m.severity === "high").map((m) => m.area);
    expect(high.sort()).toEqual(["housing", "income", "insurance"]);
  });

  it("marks subscriptions / transport / telecom / food as MEDIUM severity", () => {
    const r = computeFinancialCompleteness(buildInput());
    const med = r.missing.filter((m) => m.severity === "medium").map((m) => m.area);
    expect(med.sort()).toEqual(["food", "subscriptions", "telecom", "transport"]);
  });

  it("marks goal / category_budget / leisure as LOW severity", () => {
    const r = computeFinancialCompleteness(buildInput());
    const low = r.missing.filter((m) => m.severity === "low").map((m) => m.area);
    expect(low.sort()).toEqual(["category_budget", "goal", "leisure"]);
  });
});

describe("detectMissingFinancialAreas — sorted by severity (high first)", () => {
  it("returns missing entries sorted high → medium → low", () => {
    const list = detectMissingFinancialAreas(buildInput());
    // First three must all be high
    expect(list.slice(0, 3).every((m) => m.severity === "high")).toBe(true);
    // Last three must all be low
    expect(list.slice(-3).every((m) => m.severity === "low")).toBe(true);
  });

  it("never lists an area that's actually present", () => {
    const r = detectMissingFinancialAreas(
      buildInput({
        incomes: [income()],
        expenses: [exp("insurance")],
      }),
    );
    expect(r.find((m) => m.area === "income")).toBeUndefined();
    expect(r.find((m) => m.area === "insurance")).toBeUndefined();
  });

  it("returns a stable order across repeated calls (deterministic)", () => {
    const input = buildInput({
      incomes: [income()],
      expenses: [exp("housing"), exp("food")],
    });
    const a = detectMissingFinancialAreas(input).map((m) => m.area);
    const b = detectMissingFinancialAreas(input).map((m) => m.area);
    expect(a).toEqual(b);
  });

  it("goal presence boosts the score by exactly 5 — locks the barème", () => {
    const without = computeFinancialCompleteness(
      buildInput({ incomes: [income()] }),
    );
    const withGoal = computeFinancialCompleteness(
      buildInput({ incomes: [income()], goals: [goal()] }),
    );
    expect(withGoal.score - without.score).toBe(5);
  });

  it("category_budget presence boosts the score by exactly 5", () => {
    const without = computeFinancialCompleteness(
      buildInput({ incomes: [income()] }),
    );
    const withBudget = computeFinancialCompleteness(
      buildInput({ incomes: [income()], categoryBudgets: [budget()] }),
    );
    expect(withBudget.score - without.score).toBe(5);
  });

  it("idempotent with computeFinancialCompleteness().missing modulo ordering", () => {
    const input = buildInput({
      incomes: [income()],
      expenses: [exp("housing"), exp("food")],
    });
    const detect = detectMissingFinancialAreas(input);
    const compute = computeFinancialCompleteness(input).missing;
    expect(detect.length).toBe(compute.length);
    expect(detect.map((m) => m.area).sort()).toEqual(
      compute.map((m) => m.area).slice().sort(),
    );
  });
});
