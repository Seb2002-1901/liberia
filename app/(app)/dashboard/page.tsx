import type { Metadata } from "next";
import Link from "next/link";
import {
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
import { CoachButton } from "@/components/dashboard/coach-button";
import { EXPENSE_CATEGORIES, ROUTES } from "@/lib/constants";
import { getMyUserMemory } from "@/lib/services/memory";
import { listMyMemoryEntries } from "@/lib/services/memory-entries";
import { createClient } from "@/lib/supabase/server";
import {
  gatherExtraSignals,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";
import { HealthScoreSection } from "@/components/dashboard/health-score-section";
import { HealthTimeline } from "@/components/dashboard/health-timeline";
import { FirstSessionMissionCard } from "@/components/dashboard/first-session-mission-card";
import { buildFirstMission } from "@/lib/calculations/first-mission";
import type { DrawerData } from "@/lib/calculations/health/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.metadata");
  return { title: t("title") };
}

/** Small wrapper for parallelisable auth lookup. Returns null in
 *  unauthenticated / degraded paths so the rest of the dashboard
 *  keeps rendering without the FHS ring. */
async function getCurrentAuthUser(): Promise<{
  id: string;
  created_at: string | null;
} | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, created_at: user.created_at ?? null };
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const [data, memory, memoryEntries, authedUser] = await Promise.all([
    getFinanceData(),
    getMyUserMemory(),
    listMyMemoryEntries(),
    getCurrentAuthUser(),
  ]);

  const monthlyIncome = totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  const fixedExpenses =
    data.expenseBuckets.fixed || data.financialProfile?.monthly_expenses || 0;
  const variableExpenses = data.expenseBuckets.variable;
  const totalExpenses = fixedExpenses + variableExpenses;
  const monthBudgetStatus = buildBudgetStatus(
    data.expenses,
    data.categoryBudgets.map((b) => ({
      category: b.category,
      monthly_limit: b.monthly_limit,
    })),
  );
  const monthlyExpenses = fixedExpenses;
  const currentSavings = data.financialProfile?.current_savings ?? 0;

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
  const completeness = computeFinancialCompleteness({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    categoryBudgets: data.categoryBudgets,
  });
  const nextAction = computeNextAction({
    completeness,
    opportunities: dashboardOpportunities,
    runwayMonths: runway,
    goalCount: data.goals.length,
  });

  const discipline = computeDisciplineScore({
    budgetStatus: monthBudgetStatus,
    savingsRate,
    runwayMonths: runway,
    monthlyTransactions: data.expenseBuckets.transactions,
  });
  const hasPersonalityNotes = Boolean(
    memory?.progress_notes ||
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

  // Phase 3.2 — Financial Health Score. Single source of truth for
  // the dashboard ring, the drawer, and the coach context. The writer
  // is idempotent on (user_id, week) ; subsequent calls within the
  // same week are no-ops. When the auth path fails (degraded mode),
  // we skip the ring entirely rather than render a half-broken state.
  let drawerData: DrawerData | null = null;
  if (authedUser?.id) {
    try {
      const extras = await gatherExtraSignals({
        userId: authedUser.id,
        financeData: data,
        accountCreatedAt: authedUser.created_at ?? null,
      });
      drawerData = await getOrSealDrawerData({
        userId: authedUser.id,
        financeData: data,
        extras,
      });
    } catch (err) {
      console.error("[dashboard] failed to compute health drawer data", err);
      drawerData = null;
    }
  }

  // Phase 4.0 J4 — Mission du moment. Calculée à partir de
  // primitives déjà calculées plus haut (goals, runway,
  // currentSavings, completeness, drawerData). Aucun recalcul de
  // formule FHS. Le composant est toujours rendu (anti-vide).
  const MAJOR_AREAS = ["income", "housing", "insurance", "food", "transport"] as const;
  const filledMajorSet = new Set<string>(completeness.detected);
  const filledMajorAreasCount = MAJOR_AREAS.filter((a) =>
    filledMajorSet.has(a),
  ).length;
  const firstMissingMajor =
    MAJOR_AREAS.find((a) => !filledMajorSet.has(a)) ?? null;
  const activeGoalsCount = data.goals.filter((g) => !g.is_completed).length;
  const firstMission = buildFirstMission({
    goalsCount: activeGoalsCount,
    runwayMonths: Number.isFinite(runway) ? runway : 999,
    hasCurrentSavings: currentSavings > 0,
    filledMajorAreasCount,
    missingMajorArea: firstMissingMajor,
    recommendation: drawerData?.recommendation ?? null,
  });

  // Phase 4.0 J6 — dashboard épuré, 7 sections :
  //   1. PageHeader
  //   2. Ring (FHS) + AdvisorCard côte à côte
  //   3. FirstSessionMissionCard (mission du moment, J4)
  //   4. KPI strip 3 cards (Revenus · Reste · Runway)
  //   5. HealthTimeline
  //   6. GoalsSummary (si objectifs définis)
  //   7. CoachButton (CTA full-width "Parler à mon conseiller")
  // Retirés J6 : LearnedAboutYou + ProgressSinceLastVisit (logique
  // conservée dans advisor-engine pour le coach context et un futur
  // écran "Profil financier"). Retirés antérieurement : CoachTeaser,
  // ProactiveCoachCard, ResumeStrip, StatCard "Dépenses totales".
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

      {/* Phase 3.2 — Ring (état) + AdvisorCard (action) côte à côte.
          Sur mobile : Ring au-dessus, AdvisorCard prend la largeur.
          Sur desktop : Ring à gauche, AdvisorCard à droite. */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-stretch">
        {drawerData && (
          <div className="flex shrink-0 items-center justify-center sm:items-start">
            <HealthScoreSection
              data={drawerData}
              currency={data.profile.currency}
              isDemo={data.isDemo}
            />
          </div>
        )}
        <div className="w-full flex-1">
          <AdvisorCard
            summary={advisor}
            missing={completeness.missing}
            cta={nextAction.cta}
            firstName={firstName}
            currency={data.profile.currency}
            fhsConfidence={drawerData?.score.confidence ?? null}
          />
        </div>
      </div>

      <FirstSessionMissionCard mission={firstMission} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("stats.income")}
          value={formatUserCurrency(monthlyIncome, data.profile)}
          icon={<ArrowUpCircle className="h-4 w-4" />}
          tone="gold"
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

      {/* Phase 3.3.1 — timeline always mounted (even when empty) so
          the user discovers the feature on day 1. The component
          handles its own empty state with a pedagogical hint. */}
      {drawerData && <HealthTimeline data={drawerData} />}

      {/* Phase 4.0 J6 — LearnedAboutYou + ProgressSinceLastVisit
          retirés du dashboard. Le moteur advisor-engine continue à
          calculer ces deux blocs (utilisés par le coach context et
          réservés pour un futur écran "Profil financier"). Voir
          components/dashboard/{learned-about-you,progress-since-last-visit}.tsx. */}

      {data.goals.length > 0 && (
        <GoalsSummary goals={data.goals} currency={data.profile.currency} />
      )}

      <CoachButton />
    </div>
  );
}
