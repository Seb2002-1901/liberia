import { describe, expect, it } from "vitest";
import { buildAdvisorSummary } from "@/lib/calculations/advisor-engine";
import type { NextAction } from "@/lib/calculations/next-action";
import type {
  AdviceConfidenceResult,
} from "@/lib/calculations/advice-confidence";
import type { CompletenessResult } from "@/lib/calculations/completeness";
import type { DisciplineResult } from "@/lib/calculations/discipline";
import type { Opportunity } from "@/lib/calculations/opportunities";
import type {
  CategoryBudget,
  Expense,
  Goal,
  UserMemory,
  UserMemoryEntry,
} from "@/types/database";

// Phase 3.1.11 — AdvisorEngine. Lock the caps (1/3/3/3/5/5) and the
// "no duplication with primary action" invariant.

const NOW = new Date("2024-06-15T12:00:00.000Z");

function emptyCompleteness(structurelle = 100): CompletenessResult {
  return {
    score: structurelle,
    structurelle,
    detaillee: structurelle,
    optimale: structurelle,
    detected: [],
    missing: [],
    reliability: structurelle >= 90 ? "high" : structurelle >= 70 ? "medium" : "low",
    canEstimateSavings: structurelle >= 70,
  };
}

function emptyDiscipline(): DisciplineResult {
  return {
    score: 80,
    tier: "good",
    breakdown: { budget: 30, savings: 25, emergency: 20, tracking: 5 },
    weakest: "none",
  };
}

function emptyConfidence(level: AdviceConfidenceResult["level"] = "MEDIUM"): AdviceConfidenceResult {
  return { level, weakest: "none" };
}

function emptyNextAction(): NextAction {
  return {
    kind: "continue",
    priority: "low",
    titleKey: "continue.title",
    bodyKey: "continue.body",
    payload: {},
    cta: null,
    monthlyImpact: 0,
  };
}

describe("buildAdvisorSummary — primary action invariants", () => {
  it("never returns more than 3 priorities", () => {
    const opps: Opportunity[] = Array.from({ length: 7 }, (_, i) => ({
      kind: "budget_over",
      priority: "high",
      payload: { category: "food" + i, amount: 100, limit: 200 },
      monthlyImpact: 100 - i,
      yearlyImpact: 1200,
      action: "x",
    }));
    const r = buildAdvisorSummary({
      nextAction: emptyNextAction(),
      confidence: emptyConfidence(),
      completeness: emptyCompleteness(),
      discipline: emptyDiscipline(),
      opportunities: opps,
      budgetProgress: [],
      goals: [],
      goalsRespectedCount: 0,
      expenses: [],
      categoryBudgets: [],
      memory: null,
      memoryEntries: [],
      runwayMonths: 6,
      savingsRate: 0.2,
      now: NOW,
    });
    expect(r.priorities.length).toBeLessThanOrEqual(3);
  });

  it("forwards the next-action kind verbatim as the primaryAction", () => {
    const r = buildAdvisorSummary({
      nextAction: {
        kind: "complete_profile",
        priority: "high",
        titleKey: "complete_profile.title",
        bodyKey: "complete_profile.bodyLow",
        payload: { score: 65 },
        cta: { type: "openCompletion", labelKey: "complete_profile.cta" },
        monthlyImpact: 0,
      },
      confidence: emptyConfidence("LOW"),
      completeness: emptyCompleteness(60),
      discipline: emptyDiscipline(),
      opportunities: [],
      budgetProgress: [],
      goals: [],
      goalsRespectedCount: 0,
      expenses: [],
      categoryBudgets: [],
      memory: null,
      memoryEntries: [],
      runwayMonths: 6,
      savingsRate: 0,
      now: NOW,
    });
    expect(r.primaryAction.kind).toBe("complete_profile.title");
    expect(r.primaryAction.priority).toBe("high");
  });

  it("includes the primaryAction in priorities[0] when distinct from top opportunity", () => {
    const r = buildAdvisorSummary({
      nextAction: {
        kind: "complete_profile",
        priority: "high",
        titleKey: "complete_profile.title",
        bodyKey: "complete_profile.bodyMedium",
        payload: {},
        cta: { type: "openCompletion", labelKey: "complete_profile.cta" },
        monthlyImpact: 0,
      },
      confidence: emptyConfidence(),
      completeness: emptyCompleteness(),
      discipline: emptyDiscipline(),
      opportunities: [
        {
          kind: "budget_over",
          priority: "high",
          payload: { category: "food", amount: 100, limit: 200 },
          monthlyImpact: 100,
          yearlyImpact: 1200,
          action: "x",
        },
      ],
      budgetProgress: [],
      goals: [],
      goalsRespectedCount: 0,
      expenses: [],
      categoryBudgets: [],
      memory: null,
      memoryEntries: [],
      runwayMonths: 6,
      savingsRate: 0.1,
      now: NOW,
    });
    expect(r.priorities[0].kind).toBe("complete_profile.title");
  });
});

describe("buildAdvisorSummary — strengths and weaknesses caps", () => {
  it("strengths never exceed 3", () => {
    const r = buildAdvisorSummary({
      nextAction: emptyNextAction(),
      confidence: emptyConfidence("HIGH"),
      completeness: emptyCompleteness(95),
      discipline: { ...emptyDiscipline(), tier: "excellent", score: 95 },
      opportunities: [],
      budgetProgress: [
        {
          category: "food",
          targetAmount: 600,
          currentSpent: 100,
          remaining: 500,
          overrun: 0,
          percentage: 0.16,
          status: "SUCCESS",
        },
      ],
      goals: [
        {
          id: "g",
          user_id: "u",
          title: "House",
          type: "purchase",
          target_amount: 100000,
          current_amount: 0,
          deadline: null,
          notes: null,
          is_completed: false,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
      goalsRespectedCount: 1,
      expenses: [],
      categoryBudgets: [],
      memory: null,
      memoryEntries: [],
      runwayMonths: 6,
      savingsRate: 0.25,
      now: NOW,
    });
    expect(r.strengths.length).toBeLessThanOrEqual(3);
  });

  it("weaknesses never exceed 3", () => {
    const r = buildAdvisorSummary({
      nextAction: emptyNextAction(),
      confidence: emptyConfidence("LOW"),
      completeness: {
        ...emptyCompleteness(0),
        missing: [
          { area: "income", severity: "high" },
          { area: "housing", severity: "high" },
          { area: "insurance", severity: "high" },
          { area: "food", severity: "medium" },
        ],
      },
      discipline: emptyDiscipline(),
      opportunities: [],
      budgetProgress: [],
      goals: [],
      goalsRespectedCount: 0,
      expenses: [],
      categoryBudgets: [],
      memory: null,
      memoryEntries: [],
      runwayMonths: 0.3,
      savingsRate: 0,
      now: NOW,
    });
    expect(r.weaknesses.length).toBeLessThanOrEqual(3);
  });

  it("flags 'missing_insurance' as a weakness when it's in the missing list", () => {
    const r = buildAdvisorSummary({
      nextAction: emptyNextAction(),
      confidence: emptyConfidence(),
      completeness: {
        ...emptyCompleteness(85),
        missing: [{ area: "insurance", severity: "high" }],
      },
      discipline: emptyDiscipline(),
      opportunities: [],
      budgetProgress: [],
      goals: [],
      goalsRespectedCount: 0,
      expenses: [],
      categoryBudgets: [],
      memory: null,
      memoryEntries: [],
      runwayMonths: 6,
      savingsRate: 0.2,
      now: NOW,
    });
    expect(r.weaknesses.find((w) => w.kind === "missing_insurance")).toBeDefined();
  });
});

describe("buildAdvisorSummary — learned about you", () => {
  it("derives 'tone_<id>' from user_memory.coaching_tone", () => {
    const memory: UserMemory = {
      id: "m",
      user_id: "u",
      coaching_tone: "direct",
      financial_personality: null,
      recurring_challenges: [],
      preferred_motivation_style: null,
      spending_triggers: [],
      progress_notes: null,
      last_coach_summary: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const r = buildAdvisorSummary({
      nextAction: emptyNextAction(),
      confidence: emptyConfidence(),
      completeness: emptyCompleteness(),
      discipline: emptyDiscipline(),
      opportunities: [],
      budgetProgress: [],
      goals: [],
      goalsRespectedCount: 0,
      expenses: [],
      categoryBudgets: [],
      memory,
      memoryEntries: [],
      runwayMonths: 6,
      savingsRate: 0.1,
      now: NOW,
    });
    expect(r.learnedAboutUser[0]?.kind).toBe("tone_direct");
  });

  it("never exceeds 5 learnedAboutUser observations", () => {
    const memory: UserMemory = {
      id: "m",
      user_id: "u",
      coaching_tone: "direct",
      financial_personality: null,
      recurring_challenges: ["impulse", "fear", "guilt", "overspend"],
      preferred_motivation_style: null,
      spending_triggers: ["stress", "boredom"],
      progress_notes: null,
      last_coach_summary: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const memoryEntries: UserMemoryEntry[] = Array.from(
      { length: 4 },
      (_, i) => ({
        id: `e${i}`,
        user_id: "u",
        kind: "goal",
        key: `goal_${i}`,
        summary: `Summary ${i}`,
        detail: null,
        importance: 5,
        confidence: 5,
        source: "coach",
        conversation_id: null,
        expires_at: null,
        last_referenced_at: null,
        archived_at: null,
        created_at: "2024-06-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      }),
    );
    const r = buildAdvisorSummary({
      nextAction: emptyNextAction(),
      confidence: emptyConfidence(),
      completeness: emptyCompleteness(),
      discipline: emptyDiscipline(),
      opportunities: [],
      budgetProgress: [],
      goals: [],
      goalsRespectedCount: 0,
      expenses: [],
      categoryBudgets: [],
      memory,
      memoryEntries,
      runwayMonths: 6,
      savingsRate: 0.1,
      now: NOW,
    });
    expect(r.learnedAboutUser.length).toBeLessThanOrEqual(5);
  });
});

describe("buildAdvisorSummary — progress since last visit", () => {
  it("counts recent expenses within the 7-day window", () => {
    const recentExpense: Expense = {
      id: "e1",
      user_id: "u",
      label: "Coop",
      amount: 30,
      category: "food",
      frequency: "one_time",
      notes: null,
      created_at: "2024-06-14T10:00:00.000Z",
      updated_at: "2024-06-14T10:00:00.000Z",
    };
    const oldExpense: Expense = {
      ...recentExpense,
      id: "e2",
      created_at: "2024-05-01T10:00:00.000Z",
      updated_at: "2024-05-01T10:00:00.000Z",
    };
    const r = buildAdvisorSummary({
      nextAction: emptyNextAction(),
      confidence: emptyConfidence(),
      completeness: emptyCompleteness(),
      discipline: emptyDiscipline(),
      opportunities: [],
      budgetProgress: [],
      goals: [],
      goalsRespectedCount: 0,
      expenses: [recentExpense, oldExpense],
      categoryBudgets: [],
      memory: null,
      memoryEntries: [],
      runwayMonths: 6,
      savingsRate: 0.1,
      now: NOW,
    });
    const ne = r.progressSinceLastVisit.find((p) => p.kind === "new_expenses");
    expect(ne?.payload.count).toBe(1);
  });

  it("never exceeds 5 events", () => {
    const recent = (id: string, created_at: string): CategoryBudget => ({
      id,
      user_id: "u",
      category: "food",
      monthly_limit: 600,
      currency: "CHF",
      created_at,
      updated_at: created_at,
    });
    const r = buildAdvisorSummary({
      nextAction: emptyNextAction(),
      confidence: emptyConfidence(),
      completeness: emptyCompleteness(),
      discipline: emptyDiscipline(),
      opportunities: [],
      budgetProgress: [],
      goals: Array.from(
        { length: 3 },
        (_, i) =>
          ({
            id: `g${i}`,
            user_id: "u",
            title: "House",
            type: "purchase",
            target_amount: 100000,
            current_amount: 0,
            deadline: null,
            notes: null,
            is_completed: false,
            created_at: "2024-06-14T00:00:00Z",
            updated_at: "2024-06-14T00:00:00Z",
          }) as Goal,
      ),
      goalsRespectedCount: 0,
      expenses: [],
      categoryBudgets: [recent("b1", "2024-06-14T00:00:00Z")],
      memory: null,
      memoryEntries: [],
      runwayMonths: 6,
      savingsRate: 0.1,
      now: NOW,
    });
    expect(r.progressSinceLastVisit.length).toBeLessThanOrEqual(5);
  });
});

describe("buildAdvisorSummary — confidence pass-through", () => {
  it("forwards the confidence tier unchanged", () => {
    const r = buildAdvisorSummary({
      nextAction: emptyNextAction(),
      confidence: emptyConfidence("HIGH"),
      completeness: emptyCompleteness(),
      discipline: emptyDiscipline(),
      opportunities: [],
      budgetProgress: [],
      goals: [],
      goalsRespectedCount: 0,
      expenses: [],
      categoryBudgets: [],
      memory: null,
      memoryEntries: [],
      runwayMonths: 6,
      savingsRate: 0.1,
      now: NOW,
    });
    expect(r.confidence).toBe("HIGH");
  });
});
