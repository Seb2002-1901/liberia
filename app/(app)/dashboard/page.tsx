import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  HeartPulse,
  PiggyBank,
  Sparkles,
  Wallet,
} from "lucide-react";
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
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { aggregateMonthlyByCategory } from "@/lib/calculations/aggregate";
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

export const metadata: Metadata = {
  title: "Tableau de bord",
};

export default async function DashboardPage() {
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
  const monthlyExpenses =
    totalMonthly(data.expenses) || data.financialProfile?.monthly_expenses || 0;
  const currentSavings = data.financialProfile?.current_savings ?? 0;
  const monthlyDebt = data.financialProfile?.monthly_debt ?? 0;
  const dti = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;

  const cashflow = calculateNetCashflow({ monthlyIncome, monthlyExpenses });
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
    behaviorTraits: data.financialProfile?.behavior_traits ?? [],
    coachingTone: memory?.coaching_tone ?? null,
    memory,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vue d'ensemble"
        title={`Salut, ${firstName}`}
        description="Voici ta photo financière du moment. Tu peux ajuster tes revenus, dépenses et objectifs à tout moment."
        actions={
          <>
            {data.isDemo && (
              <Badge variant="gold" className="gap-1">
                <Sparkles className="h-3 w-3" /> Mode démo
              </Badge>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.expenses}>Ajouter une dépense</Link>
            </Button>
            <Button asChild variant="gold" size="sm">
              <Link href={ROUTES.incomes}>Ajouter un revenu</Link>
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
        aiReady={isAnthropicConfigured() && isAdminConfigured()}
      />

      {proactiveHint && <ProactiveCoachCard hint={proactiveHint} />}

      <WeeklyRecapCard recap={weeklyRecap} />

      <div className="grid gap-4 lg:grid-cols-3">
        <StabilityCard score={stability} className="lg:col-span-2" />
        <StatCard
          label="Stress financier"
          value={`${stress}/100`}
          icon={<HeartPulse className="h-4 w-4" />}
          tone={stress >= 60 ? "negative" : "neutral"}
          hint={stress >= 60 ? "Concentre-toi sur l'essentiel ce mois-ci." : "Niveau gérable, garde le cap."}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenus mensuels"
          value={formatCurrency(monthlyIncome)}
          icon={<ArrowUpCircle className="h-4 w-4" />}
          tone="gold"
        />
        <StatCard
          label="Dépenses mensuelles"
          value={formatCurrency(monthlyExpenses)}
          icon={<ArrowDownCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Reste à vivre"
          value={formatCurrency(cashflow)}
          tone={cashflow >= 0 ? "positive" : "negative"}
          icon={<Wallet className="h-4 w-4" />}
          hint={`Taux d'épargne ${formatPercent(savingsRate)}`}
        />
        <StatCard
          label="Fonds d'urgence"
          value={
            Number.isFinite(runway)
              ? `${runway.toFixed(1)} mois`
              : "∞"
          }
          icon={<PiggyBank className="h-4 w-4" />}
          tone={runway >= 3 ? "positive" : "neutral"}
          hint={formatCurrency(currentSavings)}
        />
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
            <CardTitle>Alertes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {monthlyIncome === 0 && monthlyExpenses === 0 ? (
              // No data yet — don't display misleading "solide" alerts
              // computed from zeros (runway becomes Infinity, cashflow=0
              // shows as "positive"). Surface a calm onboarding cue.
              <Alert
                tone="neutral"
                title="Renseigne tes données pour démarrer"
                text="Ajoute tes revenus et dépenses pour voir tes premières alertes — quelques minutes suffisent."
              />
            ) : (
              <>
                <Alert
                  tone={cashflow < 0 ? "danger" : "neutral"}
                  title={cashflow < 0 ? "Tu dépenses plus que tu ne gagnes" : "Ton flux mensuel est positif"}
                  text={
                    cashflow < 0
                      ? "Identifie 1 ou 2 dépenses non essentielles à réduire."
                      : "Pense à automatiser une épargne mensuelle."
                  }
                />
                <Alert
                  tone={runway < 1 ? "warning" : runway >= 3 ? "success" : "neutral"}
                  title={
                    runway < 1
                      ? "Fonds d'urgence très faible"
                      : runway >= 3
                        ? "Fonds d'urgence solide"
                        : "Fonds d'urgence en construction"
                  }
                  text={
                    runway < 1
                      ? "Objectif court terme : 1 mois de dépenses de côté."
                      : runway >= 3
                        ? "Continue à le préserver, c'est ta tranquillité."
                        : "Vise progressivement 3 mois de dépenses."
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
