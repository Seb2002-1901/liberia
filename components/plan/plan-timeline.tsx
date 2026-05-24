import { PlanStepItem } from "@/components/plan/plan-step-item";
import type { FinancialPlanStep } from "@/types/database";

interface PlanTimelineProps {
  steps: FinancialPlanStep[];
}

export function PlanTimeline({ steps }: PlanTimelineProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Pas encore d'étapes dans ce plan.
      </p>
    );
  }

  // Group by week_number.
  const byWeek = new Map<number, FinancialPlanStep[]>();
  for (const step of steps) {
    const arr = byWeek.get(step.week_number) ?? [];
    arr.push(step);
    byWeek.set(step.week_number, arr);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-8">
      {weeks.map((weekNumber) => {
        const weekSteps = byWeek.get(weekNumber)!;
        const weekFocus = weekSteps[0]?.focus ?? "";
        const done = weekSteps.filter((s) => s.is_completed).length;
        return (
          <section key={weekNumber} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-xl font-semibold gold-text">
                  S{weekNumber}
                </span>
                <h3 className="font-medium text-foreground">{weekFocus}</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {done} / {weekSteps.length} faits
              </span>
            </div>
            <ul className="space-y-2.5">
              {weekSteps.map((step) => (
                <PlanStepItem key={step.id} step={step} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
