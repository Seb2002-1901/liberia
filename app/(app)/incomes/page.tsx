import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Revenus",
};

export default async function IncomesPage() {
  const data = await getFinanceData();
  const monthly = totalMonthly(data.incomes);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pilotage"
        title="Tes revenus"
        description="Salaire, freelance, allocations, revenus annexes — tout ce qui rentre, classé proprement."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Revenus mensuels"
          value={formatCurrency(monthly, data.profile.currency)}
          tone="gold"
          icon={<ArrowUpCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Sources actives"
          value={`${data.incomes.length}`}
          hint="Ajoute toutes tes sources pour un calcul fidèle."
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
