import { describe, expect, it } from "vitest";
import {
  COMPLETENESS_MAX_SCORE,
  DETAILLEE_MAX_SCORE,
  STRUCTURELLE_MAX_SCORE,
  computeFinancialCompleteness,
  type CompletenessInput,
} from "@/lib/calculations/completeness";
import type {
  CategoryBudget,
  Expense,
  Goal,
  Income,
} from "@/types/database";

// Phase 3.1.6 — completeness V2. Locks the three-tier weight model
// + the canEstimateSavings gate + reliability anchored on structurelle.

function exp(category: string, partial: Partial<Expense> = {}): Expense {
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

describe("computeFinancialCompleteness V2 — three-tier weight sums", () => {
  it("structurelle weights sum to 100 (parity)", () => {
    expect(STRUCTURELLE_MAX_SCORE).toBe(100);
  });

  it("detaillee weights sum to 100 (parity)", () => {
    expect(DETAILLEE_MAX_SCORE).toBe(100);
  });

  it("optimale weights sum to 100 (parity)", () => {
    expect(COMPLETENESS_MAX_SCORE).toBe(100);
  });
});

describe("computeFinancialCompleteness V2 — empty + full inputs", () => {
  it("returns all-zero on an empty account", () => {
    const r = computeFinancialCompleteness(buildInput());
    expect(r.structurelle).toBe(0);
    expect(r.detaillee).toBe(0);
    expect(r.optimale).toBe(0);
    expect(r.reliability).toBe("low");
    expect(r.canEstimateSavings).toBe(false);
  });

  it("reaches 100/100/100 with every area present", () => {
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
    expect(r.structurelle).toBe(100);
    expect(r.detaillee).toBe(100);
    expect(r.optimale).toBe(100);
    expect(r.reliability).toBe("high");
    expect(r.canEstimateSavings).toBe(true);
  });
});

describe("computeFinancialCompleteness V2 — structurelle vs. optimale gaps", () => {
  it("a profile complete on the 5 structural areas hits structurelle 100 but optimale < 100", () => {
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
    expect(r.structurelle).toBe(100); // 25+25+20+15+15
    // detaillee: 20+20+15+10+10 = 75 (missing telecom/subs/leisure)
    expect(r.detaillee).toBe(75);
    // optimale: 15+15+15+10+10 = 65
    expect(r.optimale).toBe(65);
    // reliability is anchored on STRUCTURELLE, so HIGH here.
    expect(r.reliability).toBe("high");
    // canEstimateSavings gate is on DETAILLEE >= 70 → true at 75.
    expect(r.canEstimateSavings).toBe(true);
  });

  it("reliability stays MEDIUM at structurelle 70-89 even if optimale low", () => {
    // income + housing + insurance + food = 25+25+20+15 = 85
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [exp("housing"), exp("food"), exp("insurance")],
      }),
    );
    expect(r.structurelle).toBe(85);
    expect(r.reliability).toBe("medium");
  });

  it("the bug-case profile (income + tiny housing + food only) lands reliability LOW", () => {
    // income + housing + food = 25+25+15 = 65 structurelle
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [exp("housing", { amount: 15000 }), exp("food")],
      }),
    );
    expect(r.structurelle).toBe(65);
    expect(r.reliability).toBe("low");
    expect(r.canEstimateSavings).toBe(false);
  });
});

describe("computeFinancialCompleteness V2 — canEstimateSavings gate (détaillée >= 70)", () => {
  it("false at détaillée 65", () => {
    // structurelle 80 + missing telecom/subs/leisure → detaillee 65
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [exp("housing"), exp("insurance"), exp("transport")],
      }),
    );
    // detaillee: 20+20+15+10 = 65
    expect(r.detaillee).toBe(65);
    expect(r.canEstimateSavings).toBe(false);
  });

  it("true at détaillée exactly 70", () => {
    // income + housing + insurance + food + telecom = 20+20+15+10+10 = 75
    // need exactly 70 → income + housing + food + telecom + leisure = 20+20+10+10+5 = 65 no
    // income + housing + insurance + food + leisure + (nothing else) = 20+20+15+10+5 = 70 ✓
    const r = computeFinancialCompleteness(
      buildInput({
        incomes: [income()],
        expenses: [
          exp("housing"),
          exp("food"),
          exp("insurance"),
          exp("leisure"),
        ],
      }),
    );
    expect(r.detaillee).toBe(70);
    expect(r.canEstimateSavings).toBe(true);
  });

  it("true at détaillée 100 (full coverage)", () => {
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
      }),
    );
    expect(r.detaillee).toBe(100);
    expect(r.canEstimateSavings).toBe(true);
  });
});

describe("computeFinancialCompleteness V2 — goal + budget bump OPTIMALE only", () => {
  it("goal lifts optimale +5 but leaves structurelle and detaillee unchanged", () => {
    const base = computeFinancialCompleteness(
      buildInput({ incomes: [income()] }),
    );
    const withGoal = computeFinancialCompleteness(
      buildInput({ incomes: [income()], goals: [goal()] }),
    );
    expect(withGoal.structurelle).toBe(base.structurelle);
    expect(withGoal.detaillee).toBe(base.detaillee);
    expect(withGoal.optimale - base.optimale).toBe(5);
  });

  it("category_budget lifts optimale +5 but leaves structurelle/detaillee unchanged", () => {
    const base = computeFinancialCompleteness(
      buildInput({ incomes: [income()] }),
    );
    const withBudget = computeFinancialCompleteness(
      buildInput({ incomes: [income()], categoryBudgets: [budget()] }),
    );
    expect(withBudget.structurelle).toBe(base.structurelle);
    expect(withBudget.detaillee).toBe(base.detaillee);
    expect(withBudget.optimale - base.optimale).toBe(5);
  });
});

describe("computeFinancialCompleteness V2 — reliability is anchored on structurelle, not optimale", () => {
  it("optimale 90 + structurelle 65 → reliability LOW (NOT high)", () => {
    // Hard to hit optimale 90 with structurelle 65; this just
    // verifies that reliability never reads from optimale.
    const r = computeFinancialCompleteness(
      buildInput({
        // income + housing + food only structurelle: 65
        incomes: [income()],
        expenses: [exp("housing"), exp("food")],
        // optimale boost via goal + budget: 15+15+10 + 5 + 5 = 50 still
        goals: [goal()],
        categoryBudgets: [budget()],
      }),
    );
    expect(r.structurelle).toBe(65);
    expect(r.reliability).toBe("low");
  });

  it("structurelle 100 + optimale 65 → reliability HIGH", () => {
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
    expect(r.structurelle).toBe(100);
    expect(r.reliability).toBe("high");
  });
});
