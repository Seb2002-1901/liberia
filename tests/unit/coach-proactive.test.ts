import { describe, expect, it } from "vitest";
import { generateProactiveHint } from "@/lib/coach/proactive";
import type { Expense, Goal, Income } from "@/types/database";

const NOW = new Date("2025-05-15T12:00:00Z");
const ONE_DAY_AGO = new Date("2025-05-14T12:00:00Z").toISOString();
const TEN_DAYS_AGO = new Date("2025-05-05T12:00:00Z").toISOString();

function income(overrides: Partial<Income> = {}): Income {
  return {
    id: "i-1",
    user_id: "u-1",
    label: "x",
    amount: 100,
    category: "salary",
    frequency: "monthly",
    notes: null,
    created_at: ONE_DAY_AGO,
    updated_at: ONE_DAY_AGO,
    ...overrides,
  };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "e-1",
    user_id: "u-1",
    label: "x",
    amount: 10,
    category: "food",
    frequency: "monthly",
    notes: null,
    created_at: ONE_DAY_AGO,
    updated_at: ONE_DAY_AGO,
    ...overrides,
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "g-1",
    user_id: "u-1",
    title: "Fonds d'urgence",
    type: "emergency_fund",
    target_amount: 1000,
    current_amount: 0,
    deadline: null,
    notes: null,
    is_completed: false,
    created_at: ONE_DAY_AGO,
    updated_at: ONE_DAY_AGO,
    ...overrides,
  };
}

const baseInput = {
  incomes: [income()],
  expenses: [expense()],
  goals: [] as Goal[],
  planSteps: [],
  cashflow: 200,
  runway: 1.5,
  savingsRate: 0.1,
  hasEmergencyFund: false,
  monthlyExpenses: 1000,
  currency: "CHF",
  behaviorTraits: [] as string[],
  coachingTone: null,
  memory: null,
  now: NOW,
};

describe("generateProactiveHint — priority order", () => {
  it("returns long_inactive when no activity in last 7 days", () => {
    const hint = generateProactiveHint({
      ...baseInput,
      incomes: [income({ created_at: TEN_DAYS_AGO, updated_at: TEN_DAYS_AGO })],
      expenses: [expense({ created_at: TEN_DAYS_AGO, updated_at: TEN_DAYS_AGO })],
    });
    expect(hint?.kind).toBe("long_inactive");
  });

  it("returns goal_close when a goal is at >= 80%", () => {
    const hint = generateProactiveHint({
      ...baseInput,
      goals: [goal({ current_amount: 850, target_amount: 1000 })],
    });
    expect(hint?.kind).toBe("goal_close");
    expect(hint?.headline).toContain("85%");
  });

  it("returns tight_month when cashflow is negative", () => {
    const hint = generateProactiveHint({
      ...baseInput,
      cashflow: -200,
    });
    expect(hint?.kind).toBe("tight_month");
  });

  it("returns solid_progress when runway >= 3 and savings rate >= 15%", () => {
    const hint = generateProactiveHint({
      ...baseInput,
      runway: 4,
      savingsRate: 0.2,
      hasEmergencyFund: true,
    });
    expect(hint?.kind).toBe("solid_progress");
  });

  it("returns emergency_gap when no fund and cashflow positive", () => {
    const hint = generateProactiveHint({
      ...baseInput,
      cashflow: 300,
      hasEmergencyFund: false,
    });
    expect(hint?.kind).toBe("emergency_gap");
  });

  it("returns null when there's no meaningful signal", () => {
    const hint = generateProactiveHint({
      ...baseInput,
      incomes: [],
      expenses: [],
      goals: [],
      cashflow: 50,
      runway: 2,
      savingsRate: 0.05,
      hasEmergencyFund: true,
    });
    expect(hint).toBeNull();
  });
});

describe("generateProactiveHint — never spammy", () => {
  it("does not return long_inactive when user has no data at all", () => {
    const hint = generateProactiveHint({
      ...baseInput,
      incomes: [],
      expenses: [],
      goals: [],
    });
    expect(hint?.kind).not.toBe("long_inactive");
  });

  it("never emits NaN / undefined / null", () => {
    const hint = generateProactiveHint({
      ...baseInput,
      cashflow: -123.45,
    });
    if (hint) {
      const blob = JSON.stringify(hint);
      expect(blob).not.toMatch(/\bNaN\b|\bundefined\b|\bnull\b/i);
    }
  });
});

describe("generateProactiveHint — tone adapts headline", () => {
  it("calm tone is softer than direct on long_inactive", () => {
    const direct = generateProactiveHint({
      ...baseInput,
      incomes: [income({ created_at: TEN_DAYS_AGO, updated_at: TEN_DAYS_AGO })],
      expenses: [expense({ created_at: TEN_DAYS_AGO, updated_at: TEN_DAYS_AGO })],
      coachingTone: "direct",
    });
    const gentle = generateProactiveHint({
      ...baseInput,
      incomes: [income({ created_at: TEN_DAYS_AGO, updated_at: TEN_DAYS_AGO })],
      expenses: [expense({ created_at: TEN_DAYS_AGO, updated_at: TEN_DAYS_AGO })],
      coachingTone: "gentle",
    });
    expect(direct?.headline).not.toBe(gentle?.headline);
  });
});
