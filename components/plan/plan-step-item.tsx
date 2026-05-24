"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  Circle,
  Coins,
  Lightbulb,
  PiggyBank,
  Repeat,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toggleStep } from "@/app/actions/plans";
import type { FinancialPlanStep } from "@/types/database";

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  reduce_expense: { label: "Réduire dépense", icon: TrendingDown },
  build_emergency: { label: "Fonds d'urgence", icon: ShieldCheck },
  debt_payoff: { label: "Dette", icon: Banknote },
  automate_saving: { label: "Automatiser", icon: Repeat },
  habit: { label: "Habitude", icon: Lightbulb },
  income_boost: { label: "Revenu", icon: Coins },
  review: { label: "Revue", icon: Sparkles },
  other: { label: "Action", icon: PiggyBank },
};

interface PlanStepItemProps {
  step: FinancialPlanStep;
  disabled?: boolean;
}

export function PlanStepItem({ step, disabled }: PlanStepItemProps) {
  const [pending, startTransition] = React.useTransition();
  const [optimisticDone, setOptimisticDone] = React.useState(step.is_completed);
  const meta = CATEGORY_META[step.category ?? "other"] ?? CATEGORY_META.other;
  const Icon = meta.icon;

  React.useEffect(() => {
    setOptimisticDone(step.is_completed);
  }, [step.is_completed, step.id]);

  const onToggle = () => {
    if (disabled || pending) return;
    const next = !optimisticDone;
    setOptimisticDone(next);
    startTransition(async () => {
      const res = await toggleStep(step.id, next);
      if (!res.ok) {
        setOptimisticDone(!next);
        toast.error(res.error);
      }
    });
  };

  return (
    <li
      className={cn(
        "group relative flex gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 transition-colors",
        optimisticDone && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || pending}
        aria-pressed={optimisticDone}
        aria-label={optimisticDone ? "Marquer non fait" : "Marquer fait"}
        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {optimisticDone ? (
          <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        )}
      </button>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 items-center gap-1 rounded-md bg-secondary/60 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          {typeof step.expected_impact_eur === "number" &&
            step.expected_impact_eur > 0 && (
              <span className="inline-flex h-6 items-center rounded-md bg-[hsl(var(--gold)/0.12)] px-2 text-[11px] font-medium text-[hsl(var(--gold))]">
                ~{formatCurrency(step.expected_impact_eur)}/mois
              </span>
            )}
        </div>
        <p
          className={cn(
            "font-medium text-foreground",
            optimisticDone && "line-through decoration-foreground/40",
          )}
        >
          {step.title}
        </p>
        {step.description && (
          <p className="text-sm text-muted-foreground">{step.description}</p>
        )}
      </div>
    </li>
  );
}
