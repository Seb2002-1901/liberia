import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  HeartPulse,
  Layers,
  PiggyBank,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StabilityCard } from "@/components/dashboard/stability-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { ExpenseBreakdown } from "@/components/dashboard/expense-breakdown";
import { GoalsSummary } from "@/components/dashboard/goals-summary";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import {
  calculateExpenseRatio,
  calculateFinancialStress,
  calculateNetCashflow,
  calculateRunway,
  calculateSavingsRate,
  calculateStabilityScore,
} from "@/lib/calculations/finance";
import { formatPercent, formatUserCurrency } from "@/lib/utils";
import { aggregateMonthlyByCategory } from "@/lib/calculations/aggregate";
import {
  buildBudgetStatus,
  buildCategoryBreakdown,
} from "@/lib/calculations/analytics";
import { computeDisciplineScore } from "@/lib/calculations/discipline";
import { detectOpportunities } from "@/lib/calculations/opportunities";
import {
  computeBudgetProgress,
  computeGoalAchievementScore,
  computePotentialSavings,
} from "@/lib/calculations/budget-goals";
import { computeFinancialCompleteness } from "@/lib/calculations/completeness";
import { CompletenessCard } from "@/components/dashboard/completeness-card";
import { DisciplineCard } from "@/components/dashboard/discipline-card";
import { EXPENSE_CATEGORIES, ROUTES } from "@/lib/constants";
import { CoachTeaser } from "@/components/dashboard/coach-teaser";
import { DailyInsightCard } from "@/components/dashboard/daily-insight-card";
import { PlanTeaser } from "@/components/dashboard/plan-teaser";
import { ProactiveCoachCard } from "@/components/dashboard/proactive-coach-card";
import { WeeklyRecapCard } from "@/components/dashboard/weekly-recap-card";
import { getActivePlan } from "@/lib/services/plan";
import { getMyUserMemory, resolveCoachingTone } from "@/lib/services/memory";
import { generateWeeklyRecap } from "@/lib/recap/weekly";
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
  const transactionsCount = data.expenseBuckets.transactions;
  // Phase 3.1.3 — discipline score for the headline card. The
  // analytics page reuses the same helper for its detailed breakdown
  // so dashboard and /expenses/analytics never disagree.
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
  const dti = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;

  // The user's "Reste à vivre" KPI must reflect real-life spending
  // (including variable). Stability calcs below stay on the recurring
  // base — different concepts, different formulas.
  const cashflow = calculateNetCashflow({
    monthlyIncome,
    monthlyExpenses: totalExpenses,
  });
  const savingsRate = calculateSavingsRate({ monthlyIncome, monthlyExpenses });
  const runway = calculateRunway({ currentSavings, monthlyExpenses });
  const expenseRatio = calculateExpenseRatio({ monthlyIncome, monthlyExpenses });
  const stability = calculateStabilityScore({
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    hasEmergencyFund: data.financialProfile?.has_emergency_fund ?? false,
    debtToIncomeRatio: dti,
  });
  const stress = calculateFinancialStress({
    perceivedStress: data.financialProfile?.perceived_stress ?? 3,
    expenseRatio,
    runwayMonths: runway,
    cashflow,
  });
  const discipline = computeDisciplineScore({
    budgetStatus: monthBudgetStatus,
    savingsRate,
    runwayMonths: runway,
    monthlyTransactions: transactionsCount,
  });

  // Phase 3.1.4 — goal achievement + potential savings for the
  // dashboard's optimisation row. Reusing the existing analytics
  // primitives + the same monthBudgetStatus we computed for
  // discipline so the numbers stay consistent across cards.
  const budgetProgress = computeBudgetProgress(
    data.categoryBudgets.map((b) => ({
      category: b.category,
      monthly_limit: b.monthly_limit,
    })),
    data.expenses,
  );
  const goalAchievement = computeGoalAchievementScore(budgetProgress);
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
  const potentialSavings = computePotentialSavings(dashboardOpportunities);

  // Phase 3.1.5 — data completeness gate. The card surfaces the
  // score + missing areas; the assistant modal lets the user
  // back-fill in 30s.
  const completeness = computeFinancialCompleteness({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    categoryBudgets: data.categoryBudgets,
  });

  const expenseByCategory = aggregateMonthlyByCategory(data.expenses);

  const firstName = data.profile.full_name?.split(" ")[0] ?? "toi";

  // Weekly recap + proactive hint — both are pure derivations over
  // data already loaded above. No extra DB hop.
  const weeklyRecap = generateWeeklyRecap({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    planSteps: activePlan?.steps ?? [],
    cashflow,
    runway,
    savingsRate,
    stabilityScore: stability,
    hasEmergencyFund: data.financialProfile?.has_emergency_fund ?? false,
  });

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

      <WeeklyRecapCard recap={weeklyRecap} />

      <div className="grid gap-4 lg:grid-cols-3">
        <StabilityCard score={stability} className="lg:col-span-2" />
        <StatCard
          label={t("stats.stressLabel")}
          value={`${stress}/100`}
          icon={<HeartPulse className="h-4 w-4" />}
          tone={stress >= 60 ? "negative" : "neutral"}
          hint={stress >= 60 ? t("stats.stressHintHigh") : t("stats.stressHintLow")}
        />
      </div>

      {/*
        Phase 3.1.3 — dashboard simplified. Top 4 KPIs only: Revenus
        · Dépenses totales · Reste à vivre · Fonds d'urgence. The
        detailed expense breakdown (fixed / variable / transactions /
        category history / opportunities) lives on /expenses/analytics
        so the dashboard reads as a 5-second pulse, not a metrics
        wall.
      */}
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

      {/* Phase 3.1.5 — completeness card. Lives ABOVE the
          optimisation row because it gates the trust the user
          should place in the metrics below. When the score is low
          we want them to act on this card first. */}
      <CompletenessCard
        completeness={completeness}
        currency={data.profile.currency}
      />

      {/* Phase 3.1.4 — optimisation row. Discipline + Objectifs +
          Économies potentielles, side by side. Each is a stat card
          the user can scan in one second; the analytics CTA moves
          below as a less prominent button so the headline metrics
          dominate. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DisciplineCard
          score={discipline.score}
          tier={discipline.tier}
          weakest={discipline.weakest}
        />
        <StatCard
          label={t("stats.goalsRespected")}
          value={
            goalAchievement.total === 0
              ? t("stats.goalsEmpty")
              : `${goalAchievement.respected} / ${goalAchievement.total}`
          }
          icon={<Target className="h-4 w-4" />}
          tone={
            goalAchievement.total === 0
              ? "neutral"
              : goalAchievement.score >= 0.8
                ? "positive"
                : goalAchievement.score >= 0.5
                  ? "neutral"
                  : "negative"
          }
          hint={
            goalAchievement.total === 0
              ? t("stats.goalsEmptyHint")
              : t("stats.goalsHint", {
                  pct: Math.round(goalAchievement.score * 100),
                })
          }
        />
        <StatCard
          label={t("stats.potentialSavings")}
          value={
            !completeness.canEstimateSavings
              ? t("stats.potentialSavingsBlocked")
              : potentialSavings.monthly > 0
                ? `${formatUserCurrency(potentialSavings.monthly, data.profile)}${t("stats.perMonthSuffix")}`
                : t("stats.potentialSavingsEmpty")
          }
          icon={<Sparkles className="h-4 w-4" />}
          tone={
            !completeness.canEstimateSavings
              ? "neutral"
              : potentialSavings.monthly > 0
                ? "gold"
                : "neutral"
          }
          hint={
            !completeness.canEstimateSavings
              ? t("stats.potentialSavingsBlockedHint")
              : potentialSavings.monthly > 0
                ? t("stats.potentialSavingsHint", {
                    yearly: formatUserCurrency(
                      potentialSavings.yearly,
                      data.profile,
                    ),
                  })
                : t("stats.potentialSavingsEmptyHint")
          }
        />
      </div>

      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.expenseAnalytics}>
            <Layers className="h-4 w-4" />
            {t("stats.analyticsCtaButton")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashflowChart
            income={monthlyIncome}
            expenses={monthlyExpenses}
            currency={data.profile.currency}
          />
        </div>
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("alerts.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {monthlyIncome === 0 && monthlyExpenses === 0 ? (
              // No data yet — don't display misleading "solide" alerts
              // computed from zeros (runway becomes Infinity, cashflow=0
              // shows as "positive"). Surface a calm onboarding cue.
              <Alert
                tone="neutral"
                title={t("alerts.emptyTitle")}
                text={t("alerts.emptyText")}
              />
            ) : (
              <>
                <Alert
                  tone={cashflow < 0 ? "danger" : "neutral"}
                  title={cashflow < 0 ? t("alerts.cashflowNegativeTitle") : t("alerts.cashflowPositiveTitle")}
                  text={cashflow < 0 ? t("alerts.cashflowNegativeText") : t("alerts.cashflowPositiveText")}
                />
                <Alert
                  tone={runway < 1 ? "warning" : runway >= 3 ? "success" : "neutral"}
                  title={
                    runway < 1
                      ? t("alerts.runwayLowTitle")
                      : runway >= 3
                        ? t("alerts.runwaySolidTitle")
                        : t("alerts.runwayBuildingTitle")
                  }
                  text={
                    runway < 1
                      ? t("alerts.runwayLowText")
                      : runway >= 3
                        ? t("alerts.runwaySolidText")
                        : t("alerts.runwayBuildingText")
                  }
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExpenseBreakdown data={expenseByCategory} currency={data.profile.currency} />
        <GoalsSummary goals={data.goals} currency={data.profile.currency} />
      </div>

      <PlanTeaser
        plan={activePlan?.plan ?? null}
        steps={activePlan?.steps ?? []}
        aiReady={isAnthropicConfigured() && isAdminConfigured()}
      />

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

function Alert({
  tone,
  title,
  text,
}: {
  tone: "neutral" | "success" | "warning" | "danger";
  title: string;
  text: string;
}) {
  const styles = {
    neutral: "border-border/60 bg-secondary/30",
    success: "border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.08)]",
    warning: "border-[hsl(var(--warning)/0.25)] bg-[hsl(var(--warning)/0.08)]",
    danger: "border-[hsl(var(--destructive)/0.25)] bg-[hsl(var(--destructive)/0.08)]",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${styles}`}>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
