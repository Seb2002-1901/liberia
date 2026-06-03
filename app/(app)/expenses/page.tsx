import type { Metadata } from "next";
import { ArrowDownCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TransactionList } from "@/components/finance/transaction-list";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
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
  const data = await getFinanceData();
  const monthly = totalMonthly(data.expenses);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label={t("stats.monthly")}
          value={formatCurrency(monthly, data.profile.currency)}
          icon={<ArrowDownCircle className="h-4 w-4" />}
        />
        <StatCard
          label={t("stats.lines")}
          value={`${data.expenses.length}`}
          hint={t("stats.linesHint")}
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
