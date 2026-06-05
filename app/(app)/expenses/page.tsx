import type { Metadata } from "next";
import {
  ArrowDownCircle,
  Layers,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TransactionList } from "@/components/finance/transaction-list";
import { getFinanceData } from "@/lib/services/finance";
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from "@/app/actions/expenses";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.finance.expenses.metadata");
  return { title: t("title") };
}

export default async function ExpensesPage() {
  const t = await getTranslations("app.finance.expenses");
  const tDashboard = await getTranslations("app.dashboard.stats");
  const data = await getFinanceData();
  const { fixed, variable, total, transactions } = data.expenseBuckets;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      {/*
        Phase 3.1.1 — 4 KPIs reflecting the canonical split. Shares
        the same labels as the dashboard so the user sees identical
        numbers wherever they navigate.
      */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={tDashboard("fixedExpenses")}
          value={formatCurrency(fixed, data.profile.currency)}
          icon={<ArrowDownCircle className="h-4 w-4" />}
          hint={tDashboard("fixedExpensesHint")}
        />
        <StatCard
          label={tDashboard("variableExpenses")}
          value={formatCurrency(variable, data.profile.currency)}
          icon={<ShoppingCart className="h-4 w-4" />}
          hint={tDashboard("variableExpensesHint")}
        />
        <StatCard
          label={tDashboard("totalExpenses")}
          value={formatCurrency(total, data.profile.currency)}
          icon={<Layers className="h-4 w-4" />}
          hint={tDashboard("totalExpensesHint")}
        />
        <StatCard
          label={tDashboard("transactions")}
          value={String(transactions)}
          icon={<Receipt className="h-4 w-4" />}
          hint={tDashboard("transactionsHint")}
        />
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
