import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ScoreCard } from "@/components/dashboard/score-card";
import { PriorityCard } from "@/components/dashboard/priority-card";
import { MissionCard } from "@/components/dashboard/mission-card";
import { RoadmapTimeline } from "@/components/dashboard/roadmap-timeline";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OpportunityHighlightCard } from "@/components/dashboard/opportunity-highlight-card";
import { RepartitionDonutCard } from "@/components/dashboard/repartition-donut-card";
import { ScoreEvolutionChart } from "@/components/dashboard/score-evolution-chart";
import { TalkToAdvisorCard } from "@/components/dashboard/talk-to-advisor-card";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import {
  calculateNetCashflow,
  calculateRunway,
} from "@/lib/calculations/finance";
import {
  buildBudgetStatus,
  buildCategoryBreakdown,
} from "@/lib/calculations/analytics";
import { detectOpportunities } from "@/lib/calculations/opportunities";
import { buildFirstMission } from "@/lib/calculations/first-mission";
import { buildRoadmap } from "@/lib/calculations/roadmap-templates";
import {
  computeIncomeMonthlyDelta,
  computeExpenseMonthlyDelta,
  computeRemainderMonthlyDelta,
} from "@/lib/calculations/kpi-delta";
import { computeFinancialCompleteness } from "@/lib/calculations/completeness";
import { formatUserCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { listMyRecentSnapshots } from "@/lib/services/health-snapshots";
import { createClient } from "@/lib/supabase/server";
import {
  gatherExtraSignals,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";
import type { DrawerData } from "@/lib/calculations/health/types";
import type { GoalTypeId } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.metadata");
  return { title: t("title") };
}

/** Auth lookup parallèle. Renvoie null si dégradé pour laisser le
 *  reste du dashboard fonctionner sans FHS. */
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

/**
 * Phase 5.0 S3 — Dashboard refondu selon la maquette.
 *
 * Ordre visuel STRICT (validé fondateur) — l'œil doit suivre cette
 * progression :
 *   1. Score (où en suis-je ?)
 *   2. Priorité (que dois-je viser ?)
 *   3. Mission (que dois-je faire MAINTENANT ?)
 *   4. Roadmap (où ça me mène ?)
 *   5. KPI (mes chiffres clés)
 *   6. Opportunité (quel est le meilleur levier ?)
 *   7. Répartition (où va mon argent ?)
 *   8. Évolution (est-ce que je progresse ?)
 *   9. Coach (j'ai besoin d'aide → 1 clic)
 *
 * Le dashboard répond à UNE question : "Que dois-je faire
 * maintenant ?" Chaque carte explique, guide ou fait agir — aucune
 * carte ne se contente d'afficher une donnée.
 *
 * Aucune modification métier (FHS / Timeline / Coach / Memory /
 * Services / DB intacts).
 */
export default async function DashboardPage() {
  const [data, authedUser] = await Promise.all([
    getFinanceData(),
    getCurrentAuthUser(),
  ]);

  /* ------------------------------------------------------------------ */
  /*  Agrégats finance (mêmes calculs que Phase 4.0 J7 — préservés)     */
  /* ------------------------------------------------------------------ */

  const monthlyIncome =
    totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  const fixedExpenses =
    data.expenseBuckets.fixed || data.financialProfile?.monthly_expenses || 0;
  const variableExpenses = data.expenseBuckets.variable;
  const totalExpenses = fixedExpenses + variableExpenses;
  const currentSavings = data.financialProfile?.current_savings ?? 0;
  const cashflow = calculateNetCashflow({
    monthlyIncome,
    monthlyExpenses: totalExpenses,
  });
  const runway = calculateRunway({
    currentSavings,
    monthlyExpenses: totalExpenses,
  });
  const monthBreakdown = buildCategoryBreakdown(
    data.expenses,
    "month",
    EXPENSE_CATEGORIES.map((c) => c.id),
  );
  const monthBudgetStatus = buildBudgetStatus(
    data.expenses,
    data.categoryBudgets.map((b) => ({
      category: b.category,
      monthly_limit: b.monthly_limit,
    })),
  );
  const opportunities = detectOpportunities({
    expenseBuckets: data.expenseBuckets,
    budgetStatus: monthBudgetStatus,
    categoryBreakdown: monthBreakdown,
    monthlyIncome,
    runwayMonths: runway,
    savingsRate:
      monthlyIncome > 0 ? (monthlyIncome - fixedExpenses) / monthlyIncome : 0,
  });
  const topOpportunity = opportunities[0] ?? null;

  /* ------------------------------------------------------------------ */
  /*  Mission du moment (J4) — preservée                                 */
  /* ------------------------------------------------------------------ */

  const completeness = computeFinancialCompleteness({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    categoryBudgets: data.categoryBudgets,
  });
  const MAJOR_AREAS = [
    "income",
    "housing",
    "insurance",
    "food",
    "transport",
  ] as const;
  const filledMajorSet = new Set<string>(completeness.detected);
  const filledMajorAreasCount = MAJOR_AREAS.filter((a) =>
    filledMajorSet.has(a),
  ).length;
  const firstMissingMajor =
    MAJOR_AREAS.find((a) => !filledMajorSet.has(a)) ?? null;
  const activeGoalsCount = data.goals.filter((g) => !g.is_completed).length;

  /* ------------------------------------------------------------------ */
  /*  Financial Health Score (Phase 3.2) — drawer + snapshots récents   */
  /* ------------------------------------------------------------------ */

  let drawerData: DrawerData | null = null;
  let recentSnapshots: Awaited<ReturnType<typeof listMyRecentSnapshots>> = [];
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
      console.error("[dashboard] FHS drawer compute failed", err);
      drawerData = null;
    }
    try {
      // 12 dernières semaines pour le line chart "Évolution du score".
      recentSnapshots = await listMyRecentSnapshots(12);
    } catch (err) {
      console.error("[dashboard] snapshot listing failed", err);
      recentSnapshots = [];
    }
  }

  const firstMission = buildFirstMission({
    goalsCount: activeGoalsCount,
    runwayMonths: Number.isFinite(runway) ? runway : 999,
    hasCurrentSavings: currentSavings > 0,
    filledMajorAreasCount,
    missingMajorArea: firstMissingMajor,
    // Phase 5.0 S3.1 — passé pour calculer le montant suggéré
    // d'épargne mensuelle dans le payload de la mission low_resilience.
    monthlyIncome,
    recommendation: drawerData?.recommendation ?? null,
  });

  /* ------------------------------------------------------------------ */
  /*  Roadmap horizontale (Priority Engine v1, templates pur)            */
  /* ------------------------------------------------------------------ */

  // Goal type principal = celui du goal le plus prioritaire (le 1er
  // non-complété, par défaut chronologique). Si aucun goal, null →
  // le template "fallback" s'applique au jalon 3 ans.
  const primaryGoal = data.goals.find((g) => !g.is_completed) ?? null;
  const mainGoalType =
    (primaryGoal?.type as GoalTypeId | undefined) ?? null;
  const roadmap = buildRoadmap({
    priority: firstMission.priority,
    mainGoalType,
    currentScore: drawerData?.score.display ?? null,
  });

  /* ------------------------------------------------------------------ */
  /*  KPI deltas (mois courant vs mois précédent)                        */
  /* ------------------------------------------------------------------ */

  const incomeDelta = computeIncomeMonthlyDelta(data.incomes);
  const expenseDelta = computeExpenseMonthlyDelta(data.expenses);
  const remainderDelta = computeRemainderMonthlyDelta(
    data.incomes,
    data.expenses,
  );

  /* ------------------------------------------------------------------ */
  /*  i18n côté serveur — passé en props aux Server Components          */
  /* ------------------------------------------------------------------ */

  const t = await getTranslations("dashboard.kpi");
  const expensesShareOfIncome =
    monthlyIncome > 0 ? (totalExpenses / monthlyIncome) * 100 : null;
  const remainderShareOfIncome =
    monthlyIncome > 0 ? (cashflow / monthlyIncome) * 100 : null;

  return (
    <div className="space-y-6">
      {/* Bloc 1 — Score / Priorité / Mission */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ScoreCard
          data={drawerData}
          currency={data.profile.currency}
          isDemo={data.isDemo}
        />
        <PriorityCard
          mission={firstMission}
          runwayMonths={runway}
          drawerData={drawerData}
          currency={data.profile.currency}
          isDemo={data.isDemo}
        />
        <MissionCard mission={firstMission} />
      </div>

      {/* Bloc 2 — Roadmap horizontale */}
      <RoadmapTimeline milestones={roadmap} />

      {/* Bloc 3 — 4 KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("income.label")}
          value={
            monthlyIncome > 0
              ? formatUserCurrency(monthlyIncome, data.profile)
              : "—"
          }
          delta={monthlyIncome > 0 ? incomeDelta : null}
          polarity="income-like"
          hint={
            monthlyIncome > 0
              ? t("income.hint")
              : t("income.emptyHint")
          }
        />
        <KpiCard
          label={t("expenses.label")}
          value={
            totalExpenses > 0
              ? formatUserCurrency(totalExpenses, data.profile)
              : "—"
          }
          delta={totalExpenses > 0 ? expenseDelta : null}
          polarity="expense-like"
          hint={
            totalExpenses > 0 && expensesShareOfIncome !== null
              ? t("expenses.hintShare", {
                  share: expensesShareOfIncome.toFixed(0),
                })
              : t("expenses.emptyHint")
          }
        />
        <KpiCard
          label={t("remainder.label")}
          value={
            monthlyIncome > 0 || totalExpenses > 0
              ? formatUserCurrency(cashflow, data.profile)
              : "—"
          }
          delta={
            monthlyIncome > 0 || totalExpenses > 0 ? remainderDelta : null
          }
          polarity="income-like"
          hint={
            remainderShareOfIncome !== null
              ? t("remainder.hintShare", {
                  share: remainderShareOfIncome.toFixed(1),
                })
              : t("remainder.emptyHint")
          }
        />
        <KpiCard
          label={t("emergency.label")}
          value={
            Number.isFinite(runway)
              ? t("emergency.monthsValue", {
                  months: runway.toFixed(1),
                })
              : "∞"
          }
          delta={null}
          polarity="neutral"
          hint={
            currentSavings > 0
              ? t("emergency.hintSavings", {
                  amount: formatUserCurrency(currentSavings, data.profile),
                })
              : t("emergency.emptyHint")
          }
        />
      </div>

      {/* Bloc 4 — Opportunité / Répartition / Évolution */}
      <div className="grid gap-4 lg:grid-cols-3">
        <OpportunityHighlightCard
          opportunity={topOpportunity}
          currency={data.profile.currency}
        />
        <RepartitionDonutCard
          breakdown={monthBreakdown}
          totalExpenses={totalExpenses}
          currency={data.profile.currency}
        />
        <ScoreEvolutionChart snapshots={recentSnapshots} />
      </div>

      {/* Bloc 5 — CTA Coach */}
      <TalkToAdvisorCard />
    </div>
  );
}
