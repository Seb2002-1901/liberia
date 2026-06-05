import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseAnalyticsClient } from "@/components/finance/expense-analytics-client";
import { getFinanceData } from "@/lib/services/finance";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.finance.analytics");
  return { title: t("metaTitle") };
}

export default async function ExpensesAnalyticsPage() {
  const t = await getTranslations("app.finance.analytics");
  const data = await getFinanceData();

  // We hand the full expense list + budgets to a client component
  // because the period filter (week / month / year / 12 months) is
  // a pure UI state — recomputing on the server every click would
  // trip the user-perceived latency for no gain. The analytics math
  // is the same pure helpers used by the server context, so the
  // numbers will match the dashboard / coach to the cent.
  return (
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
          currency={data.profile.currency}
        />
      )}
    </div>
  );
}
