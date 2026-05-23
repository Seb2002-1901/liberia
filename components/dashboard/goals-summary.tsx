import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ROUTES, GOAL_TYPES } from "@/lib/constants";
import type { Goal } from "@/types/database";

export function GoalsSummary({ goals, currency = "EUR" }: { goals: Goal[]; currency?: string }) {
  if (!goals.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Objectifs</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Target className="h-5 w-5" />}
            title="Aucun objectif"
            description="Crée ton premier objectif financier pour avancer par paliers."
            action={
              <Button asChild variant="gold" size="sm">
                <Link href={ROUTES.goals}>Créer un objectif</Link>
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
        <CardTitle>Objectifs en cours</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.goals}>
            Tous <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {goals.slice(0, 3).map((g) => {
          const ratio = g.target_amount
            ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
            : 0;
          const typeLabel = GOAL_TYPES.find((t) => t.id === g.type)?.label ?? g.type;
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
