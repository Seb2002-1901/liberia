import { describe, expect, it } from "vitest";
import { buildFinanceContext } from "@/lib/ai/context";
import type { FinanceData } from "@/lib/services/finance";
import type { Goal, UserMemoryEntry } from "@/types/database";

// Phase 2.5 regression guard. The bug: the coach answered "aucun
// objectif actif" even when user_memory_entries clearly contained a
// kind='goal' row, because the finance context's "Objectifs en cours"
// section only read from the goals table. These tests lock the merged
// section behaviour:
//
//   - DB goal + memory goal → both appear under "Objectifs actuels"
//   - memory goal alone     → it appears, "Aucun objectif actif" does NOT
//   - DB goal alone         → unchanged from before
//   - both empty            → "Aucun objectif actif"
//
// They also pin the rule line that forbids the model from claiming
// no goals when the section actually contains one — that's the actual
// failure mode the user reported.

function makeFinanceData(goals: Goal[] = []): FinanceData {
  return {
    profile: {
      full_name: "Test",
      email: "t@example.com",
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
    financialProfile: {
      id: "fp-1",
      user_id: "u-1",
      situation: "stable",
      monthly_income: 6000,
      monthly_expenses: 4000,
      current_savings: 15000,
      monthly_debt: 500,
      has_emergency_fund: true,
      main_goal: "Acheter une maison",
      perceived_stress: 3,
      stability_score: 70,
      stress_score: 40,
      behavior_traits: [],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    incomes: [],
    expenses: [],
    goals,
    expenseBuckets: { fixed: 0, variable: 0, total: 0, transactions: 0 },
    categoryBudgets: [],
    isDemo: false,
  };
}

function makeGoal(partial: Partial<Goal> & { title: string }): Goal {
  return {
    id: partial.id ?? `g-${partial.title.slice(0, 8)}`,
    user_id: "u-1",
    title: partial.title,
    type: partial.type ?? "purchase",
    target_amount: partial.target_amount ?? 800000,
    current_amount: partial.current_amount ?? 25000,
    deadline: partial.deadline ?? null,
    notes: partial.notes ?? null,
    is_completed: partial.is_completed ?? false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

function makeMemoryGoal(summary: string, detail?: string): UserMemoryEntry {
  return {
    id: `m-${summary.slice(0, 8)}`,
    user_id: "u-1",
    kind: "goal",
    key: summary.toLowerCase().replace(/\s+/g, "_").slice(0, 40),
    summary,
    detail: detail ?? null,
    importance: 5,
    confidence: 5,
    source: "coach",
    conversation_id: "c-1",
    expires_at: null,
    last_referenced_at: null,
    archived_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

describe("buildFinanceContext — Objectifs actuels merges goals + memory", () => {
  it("falls back to 'Aucun objectif actif' when both sources are empty", () => {
    const out = buildFinanceContext(makeFinanceData([]), { memoryGoals: [] });
    expect(out).toContain("## Objectifs actuels");
    expect(out).toContain("Aucun objectif actif.");
  });

  it("renders DB goals alone when no memory goals are present", () => {
    const out = buildFinanceContext(
      makeFinanceData([makeGoal({ title: "Maison Lausanne" })]),
      { memoryGoals: [] },
    );
    expect(out).toContain("Maison Lausanne");
    expect(out).toContain("[source: /goals]");
    expect(out).not.toContain("Aucun objectif actif.");
  });

  it("renders memory goals alone when no DB goals are present — THIS is the regression", () => {
    const out = buildFinanceContext(makeFinanceData([]), {
      memoryGoals: [
        makeMemoryGoal("Acheter une maison à Lausanne dans 3 ans"),
      ],
    });
    expect(out).toContain("Acheter une maison à Lausanne dans 3 ans");
    expect(out).toContain("[source: mémoire conversation");
    // The whole point: NEVER say "no active goals" when memory has one.
    expect(out).not.toContain("Aucun objectif actif.");
  });

  it("renders BOTH sources together when both are present", () => {
    const out = buildFinanceContext(
      makeFinanceData([makeGoal({ title: "Voyage Japon" })]),
      {
        memoryGoals: [
          makeMemoryGoal("Constituer un fonds d'urgence de 45 000 CHF"),
        ],
      },
    );
    expect(out).toContain("Voyage Japon");
    expect(out).toContain("Constituer un fonds d'urgence");
    expect(out).not.toContain("Aucun objectif actif.");
  });

  it("includes the explicit rule forbidding 'aucun objectif actif' when the section is non-empty", () => {
    const out = buildFinanceContext(makeFinanceData([]), { memoryGoals: [] });
    // The rule line is what stops the model from contradicting the
    // merged list when it does contain entries. Lock it.
    expect(out.toLowerCase()).toContain('ne dis jamais "aucun objectif actif"');
  });

  it("appends the 'à formaliser dans /goals' hint on memory-only goals", () => {
    const out = buildFinanceContext(makeFinanceData([]), {
      memoryGoals: [makeMemoryGoal("Partir vivre au Portugal")],
    });
    expect(out).toContain("à formaliser dans /goals");
  });

  it("renders the memory goal's detail when present", () => {
    const out = buildFinanceContext(makeFinanceData([]), {
      memoryGoals: [
        makeMemoryGoal(
          "Acheter une maison",
          "Apport visé 160k, horizon 3 ans, région Lausanne",
        ),
      ],
    });
    expect(out).toContain("Apport visé 160k");
  });
});
