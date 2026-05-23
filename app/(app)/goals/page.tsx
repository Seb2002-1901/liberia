import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { GoalsList } from "@/components/finance/goals-list";
import { getFinanceData } from "@/lib/services/finance";
import { createGoal, deleteGoal, updateGoal } from "@/app/actions/goals";

export const metadata: Metadata = {
  title: "Objectifs",
};

export default async function GoalsPage() {
  const data = await getFinanceData();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pilotage"
        title="Tes objectifs financiers"
        description="Un objectif clair vaut mieux que dix bonnes intentions. Avance par paliers."
      />
      <GoalsList
        goals={data.goals}
        isDemo={data.isDemo}
        currency={data.profile.currency}
        onCreate={createGoal}
        onUpdate={updateGoal}
        onDelete={deleteGoal}
      />
    </div>
  );
}
