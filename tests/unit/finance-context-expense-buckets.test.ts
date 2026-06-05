import { describe, expect, it } from "vitest";
import { buildFinanceContext } from "@/lib/ai/context";
import type { FinanceData } from "@/lib/services/finance";

// Phase 3.1.1 regression guard. The coach's "aucun objectif actif"
// bug (Phase 2.5) was caused by a prompt section the LLM treated as
// authoritative while the data lived elsewhere. The same failure
// mode applies here: if the new expense buckets aren't surfaced in
// the prompt, the coach will keep quoting "Dépenses mensuelles: X"
// using the old single number, contradicting the dashboard. These
// tests lock that every bucket lands in the rendered context.

function makeFinanceData(
  buckets: { fixed: number; variable: number; total: number; transactions: number },
): FinanceData {
  return {
    profile: {
      full_name: "T",
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
      monthly_debt: 0,
      has_emergency_fund: true,
      main_goal: null,
      perceived_stress: 3,
      stability_score: 70,
      stress_score: 40,
      behavior_traits: [],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    incomes: [],
    expenses: [],
    goals: [],
    expenseBuckets: buckets,
    isDemo: false,
  };
}

describe("buildFinanceContext — expense bucket surfacing", () => {
  it("renders all four expense numbers in the indicators section", () => {
    const out = buildFinanceContext(
      makeFinanceData({
        fixed: 1500,
        variable: 110,
        total: 1610,
        transactions: 2,
      }),
    );
    expect(out).toContain("Dépenses fixes");
    expect(out).toContain("Dépenses variables");
    expect(out).toContain("Dépenses totales ce mois");
    expect(out).toContain("Transactions ponctuelles ce mois");
  });

  it("formats each bucket in the user's currency", () => {
    const out = buildFinanceContext(
      makeFinanceData({
        fixed: 1500,
        variable: 110,
        total: 1610,
        transactions: 2,
      }),
    );
    // formatCurrency is locale-aware; the actual rendered string
    // contains the amount + currency abbreviation. Match the amount
    // pattern rather than the exact glyphs (which depend on Intl).
    expect(out).toMatch(/1[\s'.,]?500/);
    expect(out).toMatch(/110/);
    expect(out).toMatch(/1[\s'.,]?610/);
  });

  it("surfaces the transactions count as a raw integer (no currency)", () => {
    const out = buildFinanceContext(
      makeFinanceData({
        fixed: 0,
        variable: 0,
        total: 0,
        transactions: 7,
      }),
    );
    // The count appears as just "7" on the Transactions line — make
    // sure we didn't accidentally currency-format it.
    expect(out).toMatch(/Transactions ponctuelles ce mois\s*:\s*7\b/);
  });

  it("locks the prompt rule that forbids confusing fixed with total", () => {
    const out = buildFinanceContext(
      makeFinanceData({
        fixed: 0,
        variable: 0,
        total: 0,
        transactions: 0,
      }),
    );
    expect(out.toLowerCase()).toContain("dépenses totales ce mois");
    expect(out.toLowerCase()).toContain("ne confonds jamais les deux");
  });
});
