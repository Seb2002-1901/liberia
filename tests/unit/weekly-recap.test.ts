import { describe, expect, it } from "vitest";
import { generateWeeklyRecap } from "@/lib/recap/weekly";
import type { Expense, FinancialPlanStep, Goal, Income } from "@/types/database";

const NOW = new Date("2025-05-15T12:00:00Z");
const FIVE_DAYS_AGO = new Date("2025-05-10T12:00:00Z").toISOString();
const TEN_DAYS_AGO = new Date("2025-05-05T12:00:00Z").toISOString();

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: "e-1",
    user_id: "u-1",
    label: "x",
    amount: 10,
    category: "food",
    frequency: "monthly",
    notes: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

function income(overrides: Partial<Income>): Income {
  return {
    id: "i-1",
    user_id: "u-1",
    label: "x",
    amount: 100,
    category: "salary",
    frequency: "monthly",
    notes: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: "g-1",
    user_id: "u-1",
    title: "g",
    type: "emergency_fund",
    target_amount: 1000,
    current_amount: 0,
    deadline: null,
    notes: null,
    is_completed: false,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

function step(overrides: Partial<FinancialPlanStep>): FinancialPlanStep {
  return {
    id: "s-1",
    plan_id: "p-1",
    user_id: "u-1",
    week_number: 1,
    focus: "f",
    title: "t",
    description: null,
    expected_impact_eur: null,
    category: null,
    is_completed: false,
    completed_at: null,
    position: 0,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

const baseSnapshot = {
  cashflow: 200,
  runway: 1.5,
  savingsRate: 0.08,
  stabilityScore: 55,
  hasEmergencyFund: false,
};

describe("generateWeeklyRecap — counts", () => {
  it("counts entries in current 7-day window only", () => {
    const recap = generateWeeklyRecap({
      ...baseSnapshot,
      incomes: [income({ created_at: FIVE_DAYS_AGO })],
      expenses: [
        expense({ created_at: FIVE_DAYS_AGO }),
        expense({ created_at: TEN_DAYS_AGO, id: "e-old" }),
      ],
      goals: [],
      planSteps: [],
      now: NOW,
    });
    expect(recap.entriesThisWeek).toBe(2);
    expect(recap.entriesPreviousWeek).toBe(1);
    expect(recap.activeDays).toBeGreaterThanOrEqual(1);
  });

  it("counts plan steps completed in current window", () => {
    const recap = generateWeeklyRecap({
      ...baseSnapshot,
      incomes: [],
      expenses: [],
      goals: [],
      planSteps: [
        step({ is_completed: true, completed_at: FIVE_DAYS_AGO }),
        step({ id: "s-2", is_completed: true, completed_at: TEN_DAYS_AGO }),
        step({ id: "s-3", is_completed: false }),
      ],
      now: NOW,
    });
    expect(recap.stepsCompletedThisWeek).toBe(1);
    expect(recap.stepsRemaining).toBe(1);
  });
});

describe("generateWeeklyRecap — copy adapts to context", () => {
  it("victory mentions plan steps when at least one is completed", () => {
    const recap = generateWeeklyRecap({
      ...baseSnapshot,
      incomes: [],
      expenses: [],
      goals: [],
      planSteps: [step({ is_completed: true, completed_at: FIVE_DAYS_AGO })],
      now: NOW,
    });
    expect(recap.victory.key).toMatch(/victories\.step/);
  });

  it("priority targets cashflow when negative", () => {
    const recap = generateWeeklyRecap({
      ...baseSnapshot,
      cashflow: -250,
      incomes: [],
      expenses: [],
      goals: [],
      planSteps: [],
      now: NOW,
    });
    expect(recap.nextPriority.key).toBe("priorities.cashflowNegative");
  });

  it("priority targets fund creation when none and cashflow positive", () => {
    const recap = generateWeeklyRecap({
      ...baseSnapshot,
      cashflow: 400,
      hasEmergencyFund: false,
      incomes: [],
      expenses: [],
      goals: [],
      planSteps: [],
      now: NOW,
    });
    expect(recap.nextPriority.key).toBe("priorities.noEmergency");
  });

  it("never emits NaN / undefined / null", () => {
    const recap = generateWeeklyRecap({
      ...baseSnapshot,
      cashflow: 0,
      runway: 0,
      savingsRate: 0,
      stabilityScore: 0,
      incomes: [],
      expenses: [],
      goals: [],
      planSteps: [],
      now: NOW,
    });
    const blob = JSON.stringify(recap);
    expect(blob).not.toMatch(/\bNaN\b|\bundefined\b|\bnull\b/i);
  });
});
