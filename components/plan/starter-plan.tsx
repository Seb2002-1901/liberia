import { Sparkles, BookOpen, Hourglass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanGenerateButton } from "@/components/plan/plan-generate-button";
import { getStarterPlan, type StarterPlan } from "@/lib/plan/starter-template";
import { cn } from "@/lib/utils";

interface StarterPlanProps {
  situation: "struggling" | "tight" | "stable" | "comfortable";
  aiReady: boolean;
  isDemo?: boolean;
}

/**
 * Curated 90-day plan rendered when the user has no AI-generated plan yet.
 *
 * Stays static / deterministic — no LLM call. The localised AI variant
 * is reachable via the PlanGenerateButton inside.
 */
export async function StarterPlanView({
  situation,
  aiReady,
  isDemo = false,
}: StarterPlanProps) {
  const [t, tContent] = await Promise.all([
    getTranslations("app.plan.starter"),
    getTranslations("app.plan.starter.content"),
  ]);
  const plan: StarterPlan = getStarterPlan(situation, tContent);
  const weeks = groupByWeek(plan.steps);

  return (
    <div className="space-y-6">
      <Card className="border-[hsl(var(--gold)/0.25)] bg-gradient-to-br from-[hsl(var(--gold)/0.06)] via-card/40 to-card/40">
        <CardContent className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="gold" className="gap-1">
              <Sparkles className="h-3 w-3" /> {t("badge")}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hourglass className="h-3.5 w-3.5" />
              {t("duration")}
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {plan.title}
          </h2>
          <p className="text-sm text-muted-foreground">{plan.summary}</p>
          <div className="pt-1">
            <PlanGenerateButton
              hasPlan={false}
              disabled={!aiReady || isDemo}
              disabledReason={
                isDemo
                  ? t("demoReason")
                  : !aiReady
                    ? t("aiNotReadyReason")
                    : undefined
              }
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("fineprint")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {weeks.map((week) => (
          <Card key={week.week_number} className="border-border/60">
            <CardContent className="space-y-2.5 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--gold)/0.35)] to-transparent text-[hsl(var(--gold))]"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {t("weekLabel", { n: week.week_number })}
                    </p>
                    <p className="text-sm font-medium">{week.focus}</p>
                  </div>
                </div>
              </div>
              <ul className="space-y-2">
                {week.items.map((step, i) => (
                  <li
                    key={`${week.week_number}-${i}`}
                    className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/40 p-3"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                        "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]",
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        {step.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

type WeekGroup = {
  week_number: number;
  focus: string;
  items: { title: string; description: string }[];
};

function groupByWeek(steps: StarterPlan["steps"]): WeekGroup[] {
  const map = new Map<number, WeekGroup>();
  for (const step of steps) {
    const existing = map.get(step.week_number);
    if (existing) {
      existing.items.push({ title: step.title, description: step.description });
    } else {
      map.set(step.week_number, {
        week_number: step.week_number,
        focus: step.focus,
        items: [{ title: step.title, description: step.description }],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.week_number - b.week_number);
}
