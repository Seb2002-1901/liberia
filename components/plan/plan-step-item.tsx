"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  reduce_expense: TrendingDown,
  build_emergency: ShieldCheck,
  debt_payoff: Banknote,
  automate_saving: Repeat,
  habit: Lightbulb,
  income_boost: Coins,
  review: Sparkles,
  other: PiggyBank,
};

const CATEGORY_KEYS = new Set(Object.keys(CATEGORY_ICONS));

interface PlanStepItemProps {
  step: FinancialPlanStep;
  disabled?: boolean;
}

export function PlanStepItem({ step, disabled }: PlanStepItemProps) {
  const t = useTranslations("app.plan.step");
  const [pending, startTransition] = React.useTransition();
  const [optimisticDone, setOptimisticDone] = React.useState(step.is_completed);
  const rawCategory = step.category ?? "other";
  const categoryKey = CATEGORY_KEYS.has(rawCategory) ? rawCategory : "other";
  const Icon = CATEGORY_ICONS[categoryKey];

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
        aria-label={optimisticDone ? t("ariaMarkUndone") : t("ariaMarkDone")}
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
            {t(`categories.${categoryKey}`)}
          </span>
          {typeof step.expected_impact_eur === "number" &&
            step.expected_impact_eur > 0 && (
              <span className="inline-flex h-6 items-center rounded-md bg-[hsl(var(--gold)/0.12)] px-2 text-[11px] font-medium text-[hsl(var(--gold))]">
                {t("perMonth", {
                  amount: formatCurrency(step.expected_impact_eur),
                })}
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
