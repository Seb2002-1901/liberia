import Link from "next/link";
import { ArrowRight, Map, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { FinancialPlan, FinancialPlanStep } from "@/types/database";

interface PlanTeaserProps {
  plan: FinancialPlan | null;
  steps: FinancialPlanStep[];
  aiReady: boolean;
}

export function PlanTeaser({ plan, steps, aiReady }: PlanTeaserProps) {
  if (!plan) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--gold)/0.35)] to-transparent text-[hsl(var(--gold))]"
              >
                <Map className="h-3.5 w-3.5" />
              </span>
              Ton plan financier
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Un plan d'actions sur 30, 60 ou 90 jours basé sur tes données.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild variant="gold" size="sm" disabled={!aiReady}>
            <Link href="/plan">
              <Sparkles className="h-3.5 w-3.5" />
              {aiReady ? "Générer mon plan" : "Bientôt disponible"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const total = steps.length;
  const done = steps.filter((s) => s.is_completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const nextStep = steps.find((s) => !s.is_completed);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--gold)/0.35)] to-transparent text-[hsl(var(--gold))]"
            >
              <Map className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">{plan.title}</span>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Plan {plan.horizon_days} jours · {done}/{total} étapes
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/plan">
            Ouvrir <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress
          value={pct}
          indicatorClassName="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-muted))]"
        />
        {nextStep && (
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Prochaine étape · semaine {nextStep.week_number}
            </p>
            <p className="mt-1 text-sm font-medium">{nextStep.title}</p>
            {nextStep.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {nextStep.description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
