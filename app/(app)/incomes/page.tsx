import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { TransactionList } from "@/components/finance/transaction-list";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import {
  createIncome,
  deleteIncome,
  updateIncome,
} from "@/app/actions/incomes";
import { StatCard } from "@/components/dashboard/stat-card";
import { ArrowUpCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.finance.incomes.metadata");
  return { title: t("title") };
}

export default async function IncomesPage() {
  const t = await getTranslations("app.finance.incomes");
  const data = await getFinanceData();
  const monthly = totalMonthly(data.incomes);

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
          tone="gold"
          icon={<ArrowUpCircle className="h-4 w-4" />}
        />
        <StatCard
          label={t("stats.sources")}
          value={`${data.incomes.length}`}
          hint={t("stats.sourcesHint")}
        />
      </div>

      <TransactionList
        kind="income"
        items={data.incomes}
        isDemo={data.isDemo}
        currency={data.profile.currency}
        onCreate={createIncome}
        onUpdate={updateIncome}
        onDelete={deleteIncome}
      />
    </div>
  );
}
