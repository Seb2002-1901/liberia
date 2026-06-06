import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  Sparkles,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { GoalsSummary } from "@/components/dashboard/goals-summary";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import {
  calculateNetCashflow,
  calculateRunway,
  calculateSavingsRate,
} from "@/lib/calculations/finance";
import { formatPercent, formatUserCurrency } from "@/lib/utils";
import {
  buildBudgetStatus,
  buildCategoryBreakdown,
} from "@/lib/calculations/analytics";
import { detectOpportunities } from "@/lib/calculations/opportunities";
import { computeFinancialCompleteness } from "@/lib/calculations/completeness";
import { computeNextAction } from "@/lib/calculations/next-action";
import { EXPENSE_CATEGORIES, ROUTES } from "@/lib/constants";
import { NextActionCard } from "@/components/dashboard/next-action-card";
import { CoachTeaser } from "@/components/dashboard/coach-teaser";
import { DailyInsightCard } from "@/components/dashboard/daily-insight-card";
import { ProactiveCoachCard } from "@/components/dashboard/proactive-coach-card";
import { getActivePlan } from "@/lib/services/plan";
import { getMyUserMemory, resolveCoachingTone } from "@/lib/services/memory";
import { generateProactiveHint } from "@/lib/coach/proactive";
import { isAnthropicConfigured } from "@/lib/env";
import { isAdminConfigured } from "@/lib/supabase/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.metadata");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const [data, activePlan, memory] = await Promise.all([
    getFinanceData(),
    getActivePlan(),
    getMyUserMemory(),
  ]);
  const coachingTone = resolveCoachingTone(
    memory?.coaching_tone ?? null,
    data.financialProfile?.behavior_traits ?? [],
  );

  const monthlyIncome = totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  // Phase 3.1.1 — three distinct expense numbers, never confused:
  //   - fixed     = recurring lines normalised to monthly (rent,
  //                 subscriptions, insurance...). Drives long-term
  //                 health metrics: stability score, runway, savings
  //                 rate, expense ratio — none of those should jitter
  //                 with one-off purchases.
  //   - variable  = one_time transactions logged THIS calendar month
  //                 (typically from the coach's propose_expense flow).
  //   - total     = fixed + variable. Drives the "Leftover" KPI and
  //                 the headline "Dépenses totales" card — what the
  //                 user actually has left to live on this month.
  // Fallback to the onboarding-time monthly_expenses on the legacy
  // monthly-fixed path so empty new accounts still show non-zero KPIs.
  const fixedExpenses =
    data.expenseBuckets.fixed || data.financialProfile?.monthly_expenses || 0;
  const variableExpenses = data.expenseBuckets.variable;
  const totalExpenses = fixedExpenses + variableExpenses;
  // Phase 3.1.7+ — Recompute budget + opportunities so the
  // NextAction primitive can pick the right call to action.
  const monthBudgetStatus = buildBudgetStatus(
    data.expenses,
    data.categoryBudgets.map((b) => ({
      category: b.category,
      monthly_limit: b.monthly_limit,
    })),
  );
  // Long-term health metrics intentionally use FIXED, not TOTAL —
  // stability is about your recurring burn rate vs income, not about
  // a single month of variable spending.
  const monthlyExpenses = fixedExpenses;
  const currentSavings = data.financialProfile?.current_savings ?? 0;
  const monthlyDebt = data.financialProfile?.monthly_debt ?? 0;

  // The user's "Reste à vivre" KPI must reflect real-life spending
  // (including variable). Stability calcs below stay on the recurring
  // base — different concepts, different formulas.
  const cashflow = calculateNetCashflow({
    monthlyIncome,
    monthlyExpenses: totalExpenses,
  });
  const savingsRate = calculateSavingsRate({ monthlyIncome, monthlyExpenses });
  const runway = calculateRunway({ currentSavings, monthlyExpenses });
  const monthCategoryBreakdown = buildCategoryBreakdown(
    data.expenses,
    "month",
    EXPENSE_CATEGORIES.map((c) => c.id),
  );
  const dashboardOpportunities = detectOpportunities({
    expenseBuckets: data.expenseBuckets,
    budgetStatus: monthBudgetStatus,
    categoryBreakdown: monthCategoryBreakdown,
    monthlyIncome,
    runwayMonths: runway,
    savingsRate,
  });
  // Phase 3.1.5 — data completeness gate. The card surfaces the
  // score + missing areas; the assistant modal lets the user
  // back-fill in 30s.
  const completeness = computeFinancialCompleteness({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    categoryBudgets: data.categoryBudgets,
  });
  // Phase 3.1.7 — single hero action card. Picks the best CTA
  // from the same primitives the other cards use, so the dashboard
  // never says one thing and the analytics page another.
  const nextAction = computeNextAction({
    completeness,
    opportunities: dashboardOpportunities,
    runwayMonths: runway,
    goalCount: data.goals.length,
  });

  const firstName = data.profile.full_name?.split(" ")[0] ?? "toi";

  // Weekly recap + proactive hint — both are pure derivations over
  // data already loaded above. No extra DB hop.
  const proactiveHint = generateProactiveHint({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    planSteps: activePlan?.steps ?? [],
    cashflow,
    runway,
    savingsRate,
    hasEmergencyFund: data.financialProfile?.has_emergency_fund ?? false,
    monthlyExpenses,
    currency: data.profile.currency,
    locale: data.profile.locale,
    behaviorTraits: data.financialProfile?.behavior_traits ?? [],
    coachingTone: memory?.coaching_tone ?? null,
    memory,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title", { firstName })}
        description={t("header.description")}
        actions={
          <>
            {data.isDemo && (
              <Badge variant="gold" className="gap-1">
                <Sparkles className="h-3 w-3" /> {t("header.demoBadge")}
              </Badge>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.expenses}>{t("header.addExpense")}</Link>
            </Button>
            <Button asChild variant="gold" size="sm">
              <Link href={ROUTES.incomes}>{t("header.addIncome")}</Link>
            </Button>
          </>
        }
      />

      <DailyInsightCard
        monthlyIncome={monthlyIncome}
        monthlyExpenses={monthlyExpenses}
        currentSavings={currentSavings}
        monthlyDebt={monthlyDebt}
        hasEmergencyFund={data.financialProfile?.has_emergency_fund ?? false}
        perceivedStress={data.financialProfile?.perceived_stress ?? 3}
        situation={data.financialProfile?.situation ?? "tight"}
        mainGoal={data.financialProfile?.main_goal ?? null}
        behaviorTraits={data.financialProfile?.behavior_traits ?? []}
        coachingTone={coachingTone}
        currency={data.profile.currency}
        locale={data.profile.locale}
        aiReady={isAnthropicConfigured() && isAdminConfigured()}
      />

      {proactiveHint && <ProactiveCoachCard hint={proactiveHint} />}

      {/*
        Phase 3.1.8 — dashboard = pilotage centre. ONE hero card
        (NextAction) + 4 KPI + Coach surfaces. Everything else
        (Complétude, Discipline, WeeklyRecap, PlanTeaser, breakdowns,
        analytics CTA) lives on /expenses/analytics or /coach. The
        dashboard now reads as a 5-second pulse: "what should I do
        next, and where do I stand?".
      */}
      <NextActionCard
        action={nextAction}
        missing={completeness.missing}
        currency={data.profile.currency}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("stats.income")}
          value={formatUserCurrency(monthlyIncome, data.profile)}
          icon={<ArrowUpCircle className="h-4 w-4" />}
          tone="gold"
        />
        <StatCard
          label={t("stats.totalExpenses")}
          value={formatUserCurrency(totalExpenses, data.profile)}
          icon={<ArrowDownCircle className="h-4 w-4" />}
          tone={totalExpenses > monthlyIncome ? "negative" : "neutral"}
          hint={t("stats.totalExpensesHint")}
        />
        <StatCard
          label={t("stats.leftover")}
          value={formatUserCurrency(cashflow, data.profile)}
          tone={cashflow >= 0 ? "positive" : "negative"}
          icon={<Wallet className="h-4 w-4" />}
          hint={t("stats.leftoverHint", { rate: formatPercent(savingsRate) })}
        />
        <StatCard
          label={t("stats.emergency")}
          value={
            Number.isFinite(runway)
              ? t("stats.monthsSuffix", { months: runway.toFixed(1) })
              : "∞"
          }
          icon={<PiggyBank className="h-4 w-4" />}
          tone={runway >= 3 ? "positive" : "neutral"}
          hint={formatUserCurrency(currentSavings, data.profile)}
        />
      </div>

      {/*
        Goals — compact when none, full summary when defined.
      */}
      {data.goals.length > 0 && (
        <GoalsSummary goals={data.goals} currency={data.profile.currency} />
      )}

      <CoachTeaser
        data={data}
        monthlyIncome={monthlyIncome}
        monthlyExpenses={monthlyExpenses}
        cashflow={cashflow}
        savingsRate={savingsRate}
        runwayMonths={runway}
      />
    </div>
  );
}

