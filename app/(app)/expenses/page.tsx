import type { Metadata } from "next";
import { ArrowDownCircle } from "lucide-react";
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

export const metadata: Metadata = {
  title: "Dépenses",
};

export default async function ExpensesPage() {
  const data = await getFinanceData();
  const monthly = totalMonthly(data.expenses);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pilotage"
        title="Tes dépenses"
        description="Liste tes dépenses essentielles et non essentielles. Sans jugement, juste pour voir clair."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Dépenses mensuelles"
          value={formatCurrency(monthly, data.profile.currency)}
          icon={<ArrowDownCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Lignes enregistrées"
          value={`${data.expenses.length}`}
          hint="Tu peux les modifier ou supprimer à tout moment."
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
