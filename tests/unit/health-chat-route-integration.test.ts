import { describe, expect, it, vi } from "vitest";
import { buildFinanceContext } from "@/lib/ai/context";
import {
  buildAxisInputs,
  type ExtraSignals,
} from "@/lib/calculations/health/axis-inputs";
import { composeHealthScore } from "@/lib/calculations/health/score";
import { buildHealthRecommendation } from "@/lib/calculations/health/recommendation";
import { computeDiscipline } from "@/lib/calculations/health/axes/discipline";
import { computeResilience } from "@/lib/calculations/health/axes/resilience";
import { computeTrajectoire } from "@/lib/calculations/health/axes/trajectoire";
import { computeCouverture } from "@/lib/calculations/health/axes/couverture";
import { computeObjectifs } from "@/lib/calculations/health/axes/objectifs";
import { computeComportement } from "@/lib/calculations/health/axes/comportement";
import type {
  AxisId,
  AxisResult,
  DrawerData,
} from "@/lib/calculations/health/types";
import type { FinanceData } from "@/lib/services/finance";

/* -------------------------------------------------------------------------- */
/*  Realistic finance fixture — same shape the chat route receives             */
/* -------------------------------------------------------------------------- */

function buildRealisticFinanceData(): FinanceData {
  return {
    profile: {
      full_name: "Test User",
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
    financialProfile: {
      id: "fp", user_id: "u",
      situation: null, main_goal: null,
      monthly_income: null, monthly_expenses: null,
      current_savings: 9000, monthly_debt_payment: null,
      has_emergency_fund: false, behavior_traits: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as unknown as FinanceData["financialProfile"],
    incomes: [
      {
        id: "i1", user_id: "u", label: "Salaire", amount: 5000,
        category: "salary", frequency: "monthly", notes: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      } as FinanceData["incomes"][number],
    ],
    expenses: [
      {
        id: "e1", user_id: "u", label: "Loyer", amount: 1500,
        category: "housing", frequency: "monthly", notes: null,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      } as FinanceData["expenses"][number],
      {
        id: "e2", user_id: "u", label: "Assurance", amount: 280,
        category: "insurance", frequency: "monthly", notes: null,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      } as FinanceData["expenses"][number],
      {
        id: "e3", user_id: "u", label: "Courses", amount: 400,
        category: "food", frequency: "monthly", notes: null,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      } as FinanceData["expenses"][number],
      {
        id: "e4", user_id: "u", label: "CFF", amount: 220,
        category: "transport", frequency: "monthly", notes: null,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      } as FinanceData["expenses"][number],
    ],
    goals: [],
    expenseBuckets: {
      fixed: 2400, variable: 0, total: 2400, transactions: 0,
    },
    categoryBudgets: [],
    isDemo: false,
  };
}

function realisticExtras(): ExtraSignals {
  return {
    txCount30d: 5,
    coachMsg30d: 0,
    memoryEntries30d: 0,
    accountAgeDays: 90,
    history3mIncomeAvg: null,
    incomeHistoryMonths: 0,
    savingsRatesByMonth: [],
  };
}

function runFullPipeline(
  financeData: FinanceData,
  extras: ExtraSignals,
): DrawerData {
  // Same wiring as health-writer.ts (without I/O).
  const bundle = buildAxisInputs({ financeData, extras });
  const axes: Record<AxisId, AxisResult> = {
    discipline: computeDiscipline(bundle.discipline),
    resilience: computeResilience(bundle.resilience),
    trajectoire: computeTrajectoire(bundle.trajectoire),
    couverture: computeCouverture(bundle.couverture),
    objectifs: computeObjectifs(bundle.objectifs),
    comportement: computeComportement(bundle.comportement),
  };
  const score = composeHealthScore({
    axes,
    previousSmoothed: 65,
    previousDisplay: 65,
    previousBand: "or",
    previousSnapshotCount: 4,
    signals: bundle.signals,
    now: new Date("2026-06-08T12:00:00Z"),
  });
  const recommendation = buildHealthRecommendation({ score });
  return {
    score,
    delta: null,
    momentum: null,
    recommendation,
    timeline: null,
  };
}

/* -------------------------------------------------------------------------- */
/*  Full-stack integration : DrawerData → context → assert section present     */
/* -------------------------------------------------------------------------- */

describe("Chat-route flow — FHS section reaches the coach prompt", () => {
  it("emits a non-null DrawerData from the writer pipeline", () => {
    const data = buildRealisticFinanceData();
    const drawer = runFullPipeline(data, realisticExtras());
    expect(drawer).not.toBeNull();
    expect(drawer.score).toBeDefined();
    expect(drawer.score.display).toBeGreaterThan(0);
    expect(drawer.score.display).toBeLessThanOrEqual(100);
  });

  it("DrawerData has a defined band (rose|ambre|or|emeraude)", () => {
    const drawer = runFullPipeline(buildRealisticFinanceData(), realisticExtras());
    expect(["rose", "ambre", "or", "emeraude"]).toContain(drawer.score.band);
  });

  it("buildFinanceContext WITH drawerData inserts the # Financial Health Score header", () => {
    const data = buildRealisticFinanceData();
    const drawer = runFullPipeline(data, realisticExtras());
    const context = buildFinanceContext(data, { drawerData: drawer });
    expect(context).toContain("# Financial Health Score");
  });

  it("the inserted section contains the EXACT displayed score", () => {
    const data = buildRealisticFinanceData();
    const drawer = runFullPipeline(data, realisticExtras());
    const context = buildFinanceContext(data, { drawerData: drawer });
    expect(context).toContain(`Score affiché : ${drawer.score.display}/100`);
  });

  it("the section appears in document order AFTER 'Indicateurs clés' (not in middle of bullets)", () => {
    const data = buildRealisticFinanceData();
    const drawer = runFullPipeline(data, realisticExtras());
    const context = buildFinanceContext(data, { drawerData: drawer });
    const idx_indicateurs = context.indexOf("## Indicateurs clés");
    const idx_fhs = context.indexOf("# Financial Health Score");
    const idx_top_depenses = context.indexOf("## Top dépenses");
    expect(idx_indicateurs).toBeGreaterThan(0);
    expect(idx_fhs).toBeGreaterThan(idx_indicateurs);
    expect(idx_top_depenses).toBeGreaterThan(idx_fhs);
  });

  it("buildFinanceContext WITHOUT drawerData does NOT insert the FHS header (regression guard)", () => {
    const data = buildRealisticFinanceData();
    const context = buildFinanceContext(data); // no options
    expect(context).not.toContain("# Financial Health Score");
  });

  it("buildFinanceContext with null drawerData does NOT insert the FHS header (regression guard)", () => {
    const data = buildRealisticFinanceData();
    const context = buildFinanceContext(data, { drawerData: null });
    expect(context).not.toContain("# Financial Health Score");
  });

  it("INSUFFICIENT_DATA score still produces a section the coach can read", () => {
    // Empty profile → INSUFFICIENT_DATA confidence, but section MUST appear.
    const data: FinanceData = {
      ...buildRealisticFinanceData(),
      incomes: [],
      expenses: [],
      expenseBuckets: { fixed: 0, variable: 0, total: 0, transactions: 0 },
      financialProfile: null,
    };
    const drawer = runFullPipeline(data, {
      ...realisticExtras(),
      accountAgeDays: 5,
    });
    expect(drawer.score.confidence).toBe("INSUFFICIENT_DATA");
    const context = buildFinanceContext(data, { drawerData: drawer });
    expect(context).toContain("# Financial Health Score");
    expect(context).toContain("Données insuffisantes");
  });
});

/* -------------------------------------------------------------------------- */
/*  Reproduction guard — the exact production assertion                        */
/* -------------------------------------------------------------------------- */

describe("Coach prompt invariants — Phase 3.2 J9 contract", () => {
  it("if drawerData is provided, the substring '# Financial Health Score' MUST appear in financeContext", () => {
    // Lock the contract that the chat route relies on. If anyone
    // refactors buildFinanceContext or renderHealthSection and breaks
    // this, the test fails immediately rather than silently dropping
    // the section in production.
    const data = buildRealisticFinanceData();
    const drawer = runFullPipeline(data, realisticExtras());

    const ctx = buildFinanceContext(data, { drawerData: drawer });

    // Two checks : header literally there + score number literally there.
    expect(ctx.includes("# Financial Health Score")).toBe(true);
    expect(ctx).toMatch(new RegExp(`Score affiché : ${drawer.score.display}/100`));
  });

  it("the coach prompt rules (prompts.ts) reference the section by its exact heading", async () => {
    const { COACH_SYSTEM_PROMPT } = await import("@/lib/ai/prompts");
    expect(COACH_SYSTEM_PROMPT).toContain("# Financial Health Score");
  });
});
