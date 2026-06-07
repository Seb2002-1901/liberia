import { describe, expect, it } from "vitest";
import {
  buildAxisInputs,
  type ExtraSignals,
} from "@/lib/calculations/health/axis-inputs";
import type { FinanceData } from "@/lib/services/finance";
import type {
  CategoryBudget,
  Expense,
  FinancialProfile,
  Goal,
  Income,
} from "@/types/database";

/* -------------------------------------------------------------------------- */
/*  Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

function income(o: Partial<Income> = {}): Income {
  return {
    id: o.id ?? `i-${Math.random()}`,
    user_id: "u",
    label: o.label ?? "Salaire",
    amount: o.amount ?? 4000,
    category: o.category ?? "salary",
    frequency: o.frequency ?? "monthly",
    notes: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  } as Income;
}

function expense(o: Partial<Expense> = {}): Expense {
  return {
    id: o.id ?? `e-${Math.random()}`,
    user_id: "u",
    label: o.label ?? "Loyer",
    amount: o.amount ?? 1200,
    category: o.category ?? "housing",
    frequency: o.frequency ?? "monthly",
    notes: null,
    created_at: o.created_at ?? "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  } as Expense;
}

function goal(o: Partial<Goal> = {}): Goal {
  return {
    id: o.id ?? `g-${Math.random()}`,
    user_id: "u",
    title: o.title ?? "Voyage",
    type: "purchase",
    target_amount: o.target_amount ?? 2000,
    current_amount: o.current_amount ?? 500,
    deadline: null,
    notes: null,
    is_completed: o.is_completed ?? false,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  } as Goal;
}

function budget(o: Partial<CategoryBudget> = {}): CategoryBudget {
  return {
    id: o.id ?? `b-${Math.random()}`,
    user_id: "u",
    category: o.category ?? "food",
    monthly_limit: o.monthly_limit ?? 600,
    currency: "CHF",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  } as CategoryBudget;
}

function financialProfile(o: Partial<FinancialProfile> = {}): FinancialProfile {
  return {
    id: "fp",
    user_id: "u",
    situation: null,
    main_goal: null,
    monthly_income: o.monthly_income ?? null,
    monthly_expenses: o.monthly_expenses ?? null,
    current_savings: o.current_savings ?? null,
    monthly_debt_payment: null,
    has_emergency_fund: false,
    behavior_traits: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as unknown as FinancialProfile;
}

function buildFinanceData(o: Partial<FinanceData> = {}): FinanceData {
  const expenses = o.expenses ?? [
    expense({ category: "housing", amount: 1200 }),
    expense({ category: "food", amount: 400 }),
    expense({ category: "transport", amount: 200 }),
  ];
  const incomes = o.incomes ?? [income({ amount: 4000, frequency: "monthly" })];
  const expenseBuckets = o.expenseBuckets ?? {
    fixed: 1800,
    variable: 0,
    total: 1800,
    transactions: 0,
  };
  return {
    profile: {
      full_name: "Test",
      email: "test@x.ch",
      avatar_url: null,
      currency: "CHF",
      locale: "fr",
      country: "CH",
      onboarding_completed: true,
    },
    subscription: {
      plan: "premium",
      status: "active",
      cancel_at_period_end: false,
      current_period_end: null,
      trial_ends_at: null,
      trial_used: false,
      price_id: null,
      has_customer: true,
    },
    financialProfile: o.financialProfile ?? null,
    incomes,
    expenses,
    goals: o.goals ?? [],
    expenseBuckets,
    categoryBudgets: o.categoryBudgets ?? [],
    isDemo: false,
  };
}

function defaultExtras(o: Partial<ExtraSignals> = {}): ExtraSignals {
  return {
    txCount30d: o.txCount30d ?? 0,
    coachMsg30d: o.coachMsg30d ?? 0,
    memoryEntries30d: o.memoryEntries30d ?? 0,
    accountAgeDays: o.accountAgeDays ?? 60,
    history3mIncomeAvg: o.history3mIncomeAvg ?? null,
    incomeHistoryMonths: o.incomeHistoryMonths ?? 0,
    savingsRatesByMonth: o.savingsRatesByMonth ?? [],
  };
}

/* -------------------------------------------------------------------------- */
/*  Discipline input                                                           */
/* -------------------------------------------------------------------------- */

describe("buildAxisInputs — Discipline", () => {
  it("maps budgetProgress to budgets list with status + percentage", () => {
    const financeData = buildFinanceData({
      expenses: [expense({ category: "food", amount: 700, frequency: "monthly" })],
      categoryBudgets: [budget({ category: "food", monthly_limit: 600 })],
    });
    const bundle = buildAxisInputs({
      financeData,
      extras: defaultExtras(),
    });
    expect(bundle.discipline.budgets.length).toBe(1);
    expect(bundle.discipline.budgets[0].status).toBe("OVER_LIMIT");
    expect(bundle.discipline.budgets[0].percentage).toBeGreaterThan(1);
  });

  it("passes savingsRatesByMonth through verbatim", () => {
    const financeData = buildFinanceData();
    const bundle = buildAxisInputs({
      financeData,
      extras: defaultExtras({ savingsRatesByMonth: [0.10, 0.12, 0.15] }),
    });
    expect(bundle.discipline.savingsRatesByMonth).toEqual([0.10, 0.12, 0.15]);
  });

  it("returns empty budgets when no category_budgets defined", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData(),
      extras: defaultExtras(),
    });
    expect(bundle.discipline.budgets.length).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/*  Résilience input                                                           */
/* -------------------------------------------------------------------------- */

describe("buildAxisInputs — Résilience", () => {
  it("reads currentSavings from financialProfile (null when missing)", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        financialProfile: financialProfile({ current_savings: 12000 }),
      }),
      extras: defaultExtras(),
    });
    expect(bundle.resilience.currentSavings).toBe(12000);
  });

  it("currentSavings = null when financialProfile is null", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({ financialProfile: null }),
      extras: defaultExtras(),
    });
    expect(bundle.resilience.currentSavings).toBeNull();
  });

  it("monthlyExpensesFixed uses expenseBuckets.fixed", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        expenseBuckets: { fixed: 2100, variable: 300, total: 2400, transactions: 5 },
      }),
      extras: defaultExtras(),
    });
    expect(bundle.resilience.monthlyExpensesFixed).toBe(2100);
  });

  it("counts distinct categories among RECURRING expenses only", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        expenses: [
          expense({ category: "housing", frequency: "monthly" }),
          expense({ category: "food", frequency: "monthly" }),
          expense({ category: "food", frequency: "monthly" }),
          // one_time doesn't count toward fixed category count
          expense({ category: "leisure", frequency: "one_time" }),
        ],
      }),
      extras: defaultExtras(),
    });
    expect(bundle.resilience.fixedExpensesCategoryCount).toBe(2);
  });
});

/* -------------------------------------------------------------------------- */
/*  Trajectoire input                                                          */
/* -------------------------------------------------------------------------- */

describe("buildAxisInputs — Trajectoire", () => {
  it("sums monthly-normalised incomes for monthlyIncome", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        incomes: [
          income({ amount: 4000, frequency: "monthly" }),
          income({ amount: 12000, frequency: "yearly" }),
        ],
      }),
      extras: defaultExtras(),
    });
    expect(bundle.trajectoire.monthlyIncome).toBe(5000);
  });

  it("falls back to financialProfile.monthly_income when incomes empty", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        incomes: [],
        financialProfile: financialProfile({ monthly_income: 3500 }),
      }),
      extras: defaultExtras(),
    });
    expect(bundle.trajectoire.monthlyIncome).toBe(3500);
  });

  it("forwards history3mIncomeAvg and incomeHistoryMonths verbatim", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData(),
      extras: defaultExtras({ history3mIncomeAvg: 4200, incomeHistoryMonths: 3 }),
    });
    expect(bundle.trajectoire.history3mIncomeAvg).toBe(4200);
    expect(bundle.trajectoire.incomeHistoryMonths).toBe(3);
  });
});

/* -------------------------------------------------------------------------- */
/*  Couverture input                                                           */
/* -------------------------------------------------------------------------- */

describe("buildAxisInputs — Couverture", () => {
  it("filledMajorAreas matches the major areas the user has declared", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        incomes: [income({ category: "salary" })],
        expenses: [
          expense({ category: "housing" }),
          expense({ category: "food" }),
        ],
      }),
      extras: defaultExtras(),
    });
    expect(bundle.couverture.filledMajorAreas).toContain("income");
    expect(bundle.couverture.filledMajorAreas).toContain("housing");
    expect(bundle.couverture.filledMajorAreas).toContain("food");
  });

  it("missingMajorAreas excludes filled and lists missing in canonical order", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        incomes: [income({ category: "salary" })],
        expenses: [expense({ category: "housing" })],
      }),
      extras: defaultExtras(),
    });
    // income and housing are filled ; insurance, food, transport missing
    expect(bundle.couverture.missingMajorAreas).toEqual([
      "insurance",
      "food",
      "transport",
    ]);
  });

  it("structurelle comes from completeness", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData(),
      extras: defaultExtras(),
    });
    expect(bundle.couverture.structurelle).toBe(
      bundle.completeness.structurelle,
    );
  });
});

/* -------------------------------------------------------------------------- */
/*  Objectifs input                                                            */
/* -------------------------------------------------------------------------- */

describe("buildAxisInputs — Objectifs", () => {
  it("splits goals into active vs completed", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        goals: [
          goal({ is_completed: false, target_amount: 1000, current_amount: 200 }),
          goal({ is_completed: true, target_amount: 500, current_amount: 500 }),
        ],
      }),
      extras: defaultExtras(),
    });
    expect(bundle.objectifs.activeGoals.length).toBe(1);
    expect(bundle.objectifs.completedGoalsCount).toBe(1);
  });

  it("profileHasActivity true when income > 0", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        incomes: [income({ amount: 4000 })],
      }),
      extras: defaultExtras(),
    });
    expect(bundle.objectifs.profileHasActivity).toBe(true);
  });

  it("profileHasActivity false on entirely empty account", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        incomes: [],
        expenses: [],
        expenseBuckets: { fixed: 0, variable: 0, total: 0, transactions: 0 },
      }),
      extras: defaultExtras(),
    });
    expect(bundle.objectifs.profileHasActivity).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*  Comportement input                                                         */
/* -------------------------------------------------------------------------- */

describe("buildAxisInputs — Comportement", () => {
  it("forwards every extras counter to the axis input", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData(),
      extras: defaultExtras({
        txCount30d: 12,
        coachMsg30d: 3,
        memoryEntries30d: 2,
        accountAgeDays: 90,
      }),
    });
    expect(bundle.comportement.txCount30d).toBe(12);
    expect(bundle.comportement.coachMsg30d).toBe(3);
    expect(bundle.comportement.memoryEntries30d).toBe(2);
    expect(bundle.comportement.accountAgeDays).toBe(90);
  });
});

/* -------------------------------------------------------------------------- */
/*  INSUFFICIENT_DATA signals                                                  */
/* -------------------------------------------------------------------------- */

describe("buildAxisInputs — INSUFFICIENT_DATA signals", () => {
  it("flags an empty profile for the short-circuit", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        incomes: [],
        expenses: [],
        expenseBuckets: { fixed: 0, variable: 0, total: 0, transactions: 0 },
      }),
      extras: defaultExtras(),
    });
    expect(bundle.signals.monthlyIncome).toBe(0);
    expect(bundle.signals.exploitableExpenses).toBe(0);
    expect(bundle.signals.filledMajorAreasCount).toBe(0);
  });

  it("filledMajorAreasCount mirrors couverture", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData(),
      extras: defaultExtras(),
    });
    expect(bundle.signals.filledMajorAreasCount).toBe(
      bundle.couverture.filledMajorAreas.length,
    );
  });
});

/* -------------------------------------------------------------------------- */
/*  Side-results                                                               */
/* -------------------------------------------------------------------------- */

describe("buildAxisInputs — side-results", () => {
  it("returns completeness for the caller to reuse", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData(),
      extras: defaultExtras(),
    });
    expect(typeof bundle.completeness.structurelle).toBe("number");
    expect(bundle.completeness.detected.length).toBeGreaterThan(0);
  });

  it("returns budgetProgress for the caller to reuse", () => {
    const bundle = buildAxisInputs({
      financeData: buildFinanceData({
        categoryBudgets: [
          budget({ category: "food", monthly_limit: 500 }),
          budget({ category: "transport", monthly_limit: 200 }),
        ],
      }),
      extras: defaultExtras(),
    });
    expect(bundle.budgetProgress.length).toBe(2);
  });
});
