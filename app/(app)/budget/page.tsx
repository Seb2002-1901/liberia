import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpCircle, Scale } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExpenseBreakdown } from "@/components/dashboard/expense-breakdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { EXPENSE_CATEGORIES, ROUTES } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  calculateExpenseRatio,
  calculateNetCashflow,
  calculateSavingsRate,
} from "@/lib/calculations/finance";
import {
  aggregateMonthlyByCategory,
  frequencyMultiplier,
} from "@/lib/calculations/aggregate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.finance.budget.metadata");
  return { title: t("title") };
}

export default async function BudgetPage() {
  const t = await getTranslations("app.finance.budget");
  const tDashboard = await getTranslations("dashboard.stats");
  const data = await getFinanceData();

  const monthlyIncome = totalMonthly(data.incomes);
  // Budget planning logic stays on the RECURRING base (essentials
  // vs non-essentials, expense ratio): these are structural
  // indicators of long-term spending balance, not month-to-month
  // transaction noise. The new variable / total cards expose the
  // actual lived spending alongside.
  const {
    fixed: monthlyExpenses,
    total: totalExpenses,
    transactions: transactionsCount,
  } = data.expenseBuckets;
  const cashflow = calculateNetCashflow({
    monthlyIncome,
    monthlyExpenses: totalExpenses,
  });
  const savingsRate = calculateSavingsRate({
    monthlyIncome,
    monthlyExpenses: totalExpenses,
  });
  const expenseRatio = calculateExpenseRatio({ monthlyIncome, monthlyExpenses });

  const essentialIds = new Set(
    EXPENSE_CATEGORIES.filter((c) => c.essential).map((c) => c.id),
  );
  const essentialTotal = data.expenses
    .filter(
      (e) =>
        essentialIds.has(e.category as never) && e.frequency !== "one_time",
    )
    .reduce(
      (sum, e) => sum + e.amount * frequencyMultiplier(e.frequency),
      0,
    );
  const nonEssentialTotal = monthlyExpenses - essentialTotal;

  const byCategory = aggregateMonthlyByCategory(data.expenses);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("stats.income")}
          value={formatCurrency(monthlyIncome, data.profile.currency)}
          icon={<ArrowUpCircle className="h-4 w-4" />}
          tone="gold"
        />
        <StatCard
          label={t("stats.leftover")}
          value={formatCurrency(cashflow, data.profile.currency)}
          tone={cashflow >= 0 ? "positive" : "negative"}
          icon={<Scale className="h-4 w-4" />}
          hint={t("stats.leftoverHint", { rate: formatPercent(savingsRate) })}
        />
        <StatCard
          label={t("stats.ratio")}
          value={formatPercent(expenseRatio)}
          hint={expenseRatio > 100 ? t("stats.ratioOver") : t("stats.ratioOk")}
        />
      </div>

      {/*
        Phase 3.1.3 — /budget stays a summary surface. The Fixed/
        Variable/Transactions detail moved to /expenses/analytics so
        the user has ONE place to drill, not three. Inline CTA
        keeps that path obvious.
      */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 text-sm">
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="font-medium">
            {tDashboard("totalExpenses")} ·{" "}
            <span className="tabular-nums">
              {formatCurrency(totalExpenses, data.profile.currency)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {t("analyticsHint", { transactions: transactionsCount })}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.expenseAnalytics}>
            {t("openAnalytics")} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("essentialVsPleasure")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <BudgetBar
              label={t("barEssential")}
              value={essentialTotal}
              max={monthlyExpenses || 1}
              currency={data.profile.currency}
            />
            <BudgetBar
              label={t("barNonEssential")}
              value={nonEssentialTotal}
              max={monthlyExpenses || 1}
              tone="muted"
              currency={data.profile.currency}
            />
            <BudgetBar
              label={t("barLeftover")}
              value={Math.max(0, cashflow)}
              max={monthlyIncome || 1}
              tone="gold"
              currency={data.profile.currency}
            />
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <ExpenseBreakdown data={byCategory} currency={data.profile.currency} />
        </div>
      </div>
    </div>
  );
}

function BudgetBar({
  label,
  value,
  max,
  tone = "default",
  currency = "CHF",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "default" | "muted" | "gold";
  currency?: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  const indicator =
    tone === "gold"
      ? "bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-muted))]"
      : tone === "muted"
      ? "bg-muted-foreground/60"
      : "bg-foreground/80";
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm">{label}</p>
        <p className="text-sm tabular-nums text-muted-foreground">
          {formatCurrency(value, currency)} <span className="text-xs">({pct}%)</span>
        </p>
      </div>
      <Progress value={pct} indicatorClassName={indicator} />
    </div>
  );
}
