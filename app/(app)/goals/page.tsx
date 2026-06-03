import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { GoalsList } from "@/components/finance/goals-list";
import { getFinanceData } from "@/lib/services/finance";
import { createGoal, deleteGoal, updateGoal } from "@/app/actions/goals";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.finance.goals.metadata");
  return { title: t("title") };
}

export default async function GoalsPage() {
  const t = await getTranslations("app.finance.goals");
  const data = await getFinanceData();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
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
