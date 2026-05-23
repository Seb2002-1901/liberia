import type { Metadata } from "next";
import { ArrowDownCircle, ArrowUpCircle, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExpenseBreakdown } from "@/components/dashboard/expense-breakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
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

export const metadata: Metadata = {
  title: "Budget",
};

export default async function BudgetPage() {
  const data = await getFinanceData();

  const monthlyIncome = totalMonthly(data.incomes);
  const monthlyExpenses = totalMonthly(data.expenses);
  const cashflow = calculateNetCashflow({ monthlyIncome, monthlyExpenses });
  const savingsRate = calculateSavingsRate({ monthlyIncome, monthlyExpenses });
  const expenseRatio = calculateExpenseRatio({ monthlyIncome, monthlyExpenses });

  const essentialIds = new Set(
    EXPENSE_CATEGORIES.filter((c) => c.essential).map((c) => c.id),
  );
  const essentialTotal = data.expenses
    .filter((e) => essentialIds.has(e.category as never))
    .reduce(
      (sum, e) => sum + e.amount * frequencyMultiplier(e.frequency),
      0,
    );
  const nonEssentialTotal = monthlyExpenses - essentialTotal;

  const byCategory = aggregateMonthlyByCategory(data.expenses);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pilotage"
        title="Ton budget mensuel"
        description="Vue d'ensemble : ce qui rentre, ce qui sort, ce qu'il reste pour avancer."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenus"
          value={formatCurrency(monthlyIncome, data.profile.currency)}
          icon={<ArrowUpCircle className="h-4 w-4" />}
          tone="gold"
        />
        <StatCard
          label="Dépenses"
          value={formatCurrency(monthlyExpenses, data.profile.currency)}
          icon={<ArrowDownCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Reste à vivre"
          value={formatCurrency(cashflow, data.profile.currency)}
          tone={cashflow >= 0 ? "positive" : "negative"}
          icon={<Scale className="h-4 w-4" />}
          hint={`Taux d'épargne ${formatPercent(savingsRate)}`}
        />
        <StatCard
          label="Ratio dépenses / revenus"
          value={formatPercent(expenseRatio)}
          hint={expenseRatio > 100 ? "Tu vis au-dessus de tes moyens." : "Marge encore disponible."}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Essentiel vs. plaisir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <BudgetBar
              label="Dépenses essentielles"
              value={essentialTotal}
              max={monthlyExpenses || 1}
              currency={data.profile.currency}
            />
            <BudgetBar
              label="Dépenses non essentielles"
              value={nonEssentialTotal}
              max={monthlyExpenses || 1}
              tone="muted"
              currency={data.profile.currency}
            />
            <BudgetBar
              label="Reste à vivre / Épargne"
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
  currency = "EUR",
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

