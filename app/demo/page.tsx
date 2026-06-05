import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  HeartPulse,
  Layers,
  PiggyBank,
  Receipt,
  ShoppingCart,
  Sparkles,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StabilityCard } from "@/components/dashboard/stability-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { ExpenseBreakdown } from "@/components/dashboard/expense-breakdown";
import { GoalsSummary } from "@/components/dashboard/goals-summary";
import {
  demoFinancialProfile,
  getDemoExpenses,
  getDemoGoals,
  getDemoIncomes,
} from "@/lib/demo/data";
import { totalMonthly } from "@/lib/services/finance";
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
import {
  aggregateMonthlyByCategory,
  computeExpenseBuckets,
} from "@/lib/calculations/aggregate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.demo.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function DemoDashboardPage() {
  const [t, tData, tDashboard] = await Promise.all([
    getTranslations("app.demo"),
    getTranslations("app.demo.data"),
    getTranslations("dashboard.stats"),
  ]);
  const tDataString = (key: string) => tData(key);
  const demoIncomes = getDemoIncomes(tDataString);
  const demoExpenses = getDemoExpenses(tDataString);
  const demoGoals = getDemoGoals(tDataString);

  const monthlyIncome = totalMonthly(demoIncomes);
  const expenseBuckets = computeExpenseBuckets(demoExpenses);
  const monthlyExpenses = expenseBuckets.fixed;
  const currentSavings = demoFinancialProfile.current_savings;
  const dti =
    monthlyIncome > 0
      ? (demoFinancialProfile.monthly_debt / monthlyIncome) * 100
      : 0;
  const cashflow = calculateNetCashflow({ monthlyIncome, monthlyExpenses });
  const savingsRate = calculateSavingsRate({ monthlyIncome, monthlyExpenses });
  const runway = calculateRunway({ currentSavings, monthlyExpenses });
  const expenseRatio = calculateExpenseRatio({ monthlyIncome, monthlyExpenses });
  const stability = calculateStabilityScore({
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    hasEmergencyFund: demoFinancialProfile.has_emergency_fund,
    debtToIncomeRatio: dti,
  });
  const stress = calculateFinancialStress({
    perceivedStress: demoFinancialProfile.perceived_stress,
    expenseRatio,
    runwayMonths: runway,
    cashflow,
  });

  const byCategory = aggregateMonthlyByCategory(demoExpenses);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.06)] p-4 text-sm">
        <p className="font-medium text-[hsl(var(--gold))]">
          {t("banner.title")}
        </p>
        <p className="text-muted-foreground">{t("banner.body")}</p>
        <div className="mt-3 flex gap-2">
          <Button asChild variant="gold" size="sm">
            <Link href={ROUTES.register}>{t("banner.createCta")}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.login}>{t("banner.loginCta")}</Link>
          </Button>
        </div>
      </div>

      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
        actions={
          <Badge variant="gold" className="gap-1">
            <Sparkles className="h-3 w-3" /> {t("header.badge")}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <StabilityCard score={stability} className="lg:col-span-2" />
        <StatCard
          label={t("stress.label")}
          value={`${stress}/100`}
          icon={<HeartPulse className="h-4 w-4" />}
          tone={stress >= 60 ? "negative" : "neutral"}
          hint={stress >= 60 ? t("stress.high") : t("stress.ok")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("stats.monthlyIncome")}
          value={formatCurrency(monthlyIncome)}
          icon={<ArrowUpCircle className="h-4 w-4" />}
          tone="gold"
        />
        <StatCard
          label={t("stats.netCashflow")}
          value={formatCurrency(cashflow)}
          tone={cashflow >= 0 ? "positive" : "negative"}
          icon={<Wallet className="h-4 w-4" />}
          hint={t("stats.savingsRateHint", { rate: formatPercent(savingsRate) })}
        />
        <StatCard
          label={t("stats.emergencyFund")}
          value={
            Number.isFinite(runway)
              ? t("stats.runwayMonths", { months: runway.toFixed(1) })
              : "∞"
          }
          icon={<PiggyBank className="h-4 w-4" />}
          hint={formatCurrency(currentSavings)}
        />
      </div>

      {/* Phase 3.1.1 — same expense breakdown row as the real
          dashboard so the demo accurately represents the product. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={tDashboard("fixedExpenses")}
          value={formatCurrency(expenseBuckets.fixed)}
          icon={<ArrowDownCircle className="h-4 w-4" />}
          hint={tDashboard("fixedExpensesHint")}
        />
        <StatCard
          label={tDashboard("variableExpenses")}
          value={formatCurrency(expenseBuckets.variable)}
          icon={<ShoppingCart className="h-4 w-4" />}
          hint={tDashboard("variableExpensesHint")}
        />
        <StatCard
          label={tDashboard("totalExpenses")}
          value={formatCurrency(expenseBuckets.total)}
          icon={<Layers className="h-4 w-4" />}
          hint={tDashboard("totalExpensesHint")}
        />
        <StatCard
          label={tDashboard("transactions")}
          value={String(expenseBuckets.transactions)}
          icon={<Receipt className="h-4 w-4" />}
          hint={tDashboard("transactionsHint")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashflowChart income={monthlyIncome} expenses={monthlyExpenses} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("recommendations.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <RecoTip
              label={t("recommendations.shortTerm.label")}
              text={t("recommendations.shortTerm.body")}
            />
            <RecoTip
              label={t("recommendations.lighter.label")}
              text={t("recommendations.lighter.body")}
            />
            <RecoTip
              label={t("recommendations.automation.label")}
              text={t("recommendations.automation.body")}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExpenseBreakdown data={byCategory} />
        <GoalsSummary goals={demoGoals} />
      </div>
    </div>
  );
}

function RecoTip({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--gold))]" />
      <p>
        <span className="font-medium text-foreground">{label}.</span> {text}
      </p>
    </div>
  );
}
