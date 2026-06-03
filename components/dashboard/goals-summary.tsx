import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ROUTES, GOAL_TYPES } from "@/lib/constants";
import type { Goal } from "@/types/database";

export async function GoalsSummary({
  goals,
  currency = "CHF",
}: {
  goals: Goal[];
  currency?: string;
}) {
  const t = await getTranslations("dashboard.goalsSummary");
  const tGoals = await getTranslations("onboarding.goals");
  if (!goals.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Target className="h-5 w-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button asChild variant="gold" size="sm">
                <Link href={ROUTES.goals}>{t("emptyCta")}</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("active")}</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.goals}>
            {t("all")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {goals.slice(0, 3).map((g) => {
          const ratio = g.target_amount
            ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
            : 0;
          const known = GOAL_TYPES.find((tp) => tp.id === g.type);
          const typeLabel = known ? tGoals(known.id) : g.type;
          return (
            <div key={g.id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{g.title}</p>
                  <p className="text-xs text-muted-foreground">{typeLabel}</p>
                </div>
                <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {formatCurrency(g.current_amount, currency)} /{" "}
                  <span className="text-foreground">
                    {formatCurrency(g.target_amount, currency)}
                  </span>
                </p>
              </div>
              <Progress value={ratio} indicatorClassName="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-muted))]" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
