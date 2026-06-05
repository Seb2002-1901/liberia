import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { TransactionList } from "@/components/finance/transaction-list";
import { getFinanceData } from "@/lib/services/finance";
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from "@/app/actions/expenses";
import { formatCurrency } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.finance.expenses.metadata");
  return { title: t("title") };
}

export default async function ExpensesPage() {
  const t = await getTranslations("app.finance.expenses");
  const tDashboard = await getTranslations("dashboard.stats");
  const data = await getFinanceData();
  const { total, transactions } = data.expenseBuckets;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      {/*
        Phase 3.1.3 — /expenses stays focused on the LIST. The
        headline of this page is the transaction list itself. We keep
        two anchor KPIs (total + tx count) so the user always knows
        the magnitude of what they're scrolling through, but the full
        fixed/variable/category breakdown lives on /expenses/analytics.
      */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={tDashboard("totalExpenses")}
          value={formatCurrency(total, data.profile.currency)}
          icon={<Layers className="h-4 w-4" />}
          hint={tDashboard("totalExpensesHint")}
          className="sm:col-span-2"
        />
        <Button asChild variant="outline" size="sm" className="h-full">
          <Link href={ROUTES.expenseAnalytics}>
            {t("stats.openAnalytics", { transactions })}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <TransactionList
        kind="expense"
        items={data.expenses}
        isDemo={data.isDemo}
        currency={data.profile.currency}
        onCreate={createExpense}
        onUpdate={updateExpense}
        onDelete={deleteExpense}
      />
    </div>
  );
}
