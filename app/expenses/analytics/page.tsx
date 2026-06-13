/**
 * /expenses/analytics — deep-dive analytique (ExpenseAnalyticsClient).
 *
 * Migrée hors de (app)/ pour bypasser l'ancien AppShell et utiliser
 * le shell V3 inline (V3Shell). "Dépenses" est marqué actif dans la
 * sidebar. Toute la logique métier (analytics client, periods,
 * categoryBudgets) est strictement préservée.
 *
 * L'auth + redirect onboarding (faits autrefois par (app)/layout.tsx)
 * sont reproduits ici.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseAnalyticsClient } from "@/components/finance/expense-analytics-client";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { calculateRunway } from "@/lib/calculations/finance";
import { ROUTES } from "@/lib/constants";
import { V3Shell } from "@/components/layout/v3-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.finance.analytics");
  return { title: t("metaTitle") };
}

export default async function ExpensesAnalyticsPage() {
  const t = await getTranslations("app.finance.analytics");
  const data = await getFinanceData();

  // Reproduit la garde de (app)/layout.tsx.
  if (!data.isDemo && !data.profile.onboarding_completed) {
    redirect(ROUTES.onboarding);
  }

  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  return (
    <V3Shell
      firstName={firstName}
      fullName={fullName}
      activeHref="/design-match/depenses-v3"
      topbarSubtitle="Analyse détaillée de vos dépenses."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={ROUTES.budget}>
              <ArrowLeft className="h-4 w-4" /> {t("backToBudget")}
            </Link>
          </Button>
        </div>

        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />

        {data.isDemo ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("demoTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t("demoBody")}
            </CardContent>
          </Card>
        ) : (
          <ExpenseAnalyticsClient
            expenses={data.expenses}
            categoryBudgets={data.categoryBudgets}
            incomes={data.incomes}
            goals={data.goals}
            currentSavings={data.financialProfile?.current_savings ?? 0}
            runwayMonths={calculateRunway({
              currentSavings: data.financialProfile?.current_savings ?? 0,
              monthlyExpenses: data.expenseBuckets.fixed || totalMonthly(data.expenses),
            })}
            currency={data.profile.currency}
          />
        )}
      </div>
    </V3Shell>
  );
}
