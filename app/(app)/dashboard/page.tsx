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
import { computeDisciplineScore } from "@/lib/calculations/discipline";
import { computeNextAction } from "@/lib/calculations/next-action";
import { computeAdviceConfidence } from "@/lib/calculations/advice-confidence";
import { computeBudgetProgress } from "@/lib/calculations/budget-goals";
import { buildAdvisorSummary } from "@/lib/calculations/advisor-engine";
import { AdvisorCard } from "@/components/dashboard/advisor-card";
import { LearnedAboutYou } from "@/components/dashboard/learned-about-you";
import { ProgressSinceLastVisit } from "@/components/dashboard/progress-since-last-visit";
import { EXPENSE_CATEGORIES, ROUTES } from "@/lib/constants";
import { ResumeStrip } from "@/components/dashboard/resume-strip";
import { CoachTeaser } from "@/components/dashboard/coach-teaser";
import { ProactiveCoachCard } from "@/components/dashboard/proactive-coach-card";
import { getActivePlan } from "@/lib/services/plan";
import { getMyUserMemory } from "@/lib/services/memory";
import { listMyMemoryEntries } from "@/lib/services/memory-entries";
import { generateProactiveHint } from "@/lib/coach/proactive";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.metadata");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const [data, activePlan, memory, memoryEntries] = await Promise.all([
    getFinanceData(),
    getActivePlan(),
    getMyUserMemory(),
    listMyMemoryEntries(),
  ]);

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

  // Phase UX premium — ultra-compact resume strip beneath the 4 KPI.
  // Two micro-scores (discipline + complétude structurelle) summarise
  // "where do I stand" in a single line so the dashboard doesn't need
  // a full card per axis. The detailed views live on /expenses/analytics.
  const discipline = computeDisciplineScore({
    budgetStatus: monthBudgetStatus,
    savingsRate,
    runwayMonths: runway,
    monthlyTransactions: data.expenseBuckets.transactions,
  });
  // Phase 3.1.10 — coach confidence chip. We don't fetch memory
  // entries on the dashboard render path (the chat route does that
  // server-side via the admin client); we rely on the static
  // personality layer + budgets + goals as proxies. The chip
  // intentionally skews towards LOW when the dashboard has thin
  // data — same conservative gate as the coach itself.
  const hasPersonalityNotes = Boolean(
    memory?.financial_personality ||
      memory?.progress_notes ||
      memory?.preferred_motivation_style ||
      (memory?.spending_triggers?.length ?? 0) > 0 ||
      (memory?.recurring_challenges?.length ?? 0) > 0,
  );
  const adviceConfidence = computeAdviceConfidence({
    completeness,
    hasBudgets: data.categoryBudgets.length > 0,
    hasGoals: data.goals.length > 0,
    memoryEntriesCount: memoryEntries.length,
    hasPersonalityNotes,
  });

  // Phase 3.1.11 — AdvisorEngine consolidates every primitive
  // already computed above into a single AdvisorSummary the new
  // hero card + LearnedAboutYou + ProgressSinceLastVisit cards
  // read directly. Zero duplicated math.
  const budgetProgress = computeBudgetProgress(
    data.categoryBudgets.map((b) => ({
      category: b.category,
      monthly_limit: b.monthly_limit,
    })),
    data.expenses,
  );
  const advisor = buildAdvisorSummary({
    nextAction,
    confidence: adviceConfidence,
    completeness,
    discipline,
    opportunities: dashboardOpportunities,
    budgetProgress,
    goals: data.goals,
    goalsRespectedCount: budgetProgress.filter(
      (p) => p.status === "SUCCESS",
    ).length,
    expenses: data.expenses,
    categoryBudgets: data.categoryBudgets,
    memory,
    memoryEntries,
    runwayMonths: runway,
    savingsRate,
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

      {proactiveHint && <ProactiveCoachCard hint={proactiveHint} />}

      {/*
        Phase 3.1.11 — dashboard hierarchy:
          1. AdvisorCard (hero) — single CTA + secondary priorities
          2. 4 KPI (Revenus / Dépenses / Reste / Urgence)
          3. LearnedAboutYou (hidden when nothing learned)
          4. ProgressSinceLastVisit (hidden when nothing changed)
          5. ResumeStrip (Discipline + Complétude one-liner)
          6. GoalsSummary (conditional)
          7. CoachTeaser
      */}
      <AdvisorCard
        summary={advisor}
        missing={completeness.missing}
        cta={nextAction.cta}
        firstName={firstName}
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

      {/* Phase 3.1.11 — two compact context cards. Both self-hide
          when there's nothing to say so the dashboard stays calm
          for brand-new accounts. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <LearnedAboutYou summary={advisor} />
        <ProgressSinceLastVisit summary={advisor} />
      </div>

      {/* Phase UX premium — ultra-compact "where do I stand" line. */}
      <ResumeStrip
        discipline={discipline.score}
        completeness={completeness.structurelle}
        reliability={completeness.reliability}
        analyticsHref={ROUTES.expenseAnalytics}
      />

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

