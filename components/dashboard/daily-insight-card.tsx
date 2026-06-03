import Link from "next/link";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { generateLocalInsight } from "@/lib/insights/local";
import { ROUTES } from "@/lib/constants";

interface DailyInsightCardProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  monthlyDebt: number;
  hasEmergencyFund: boolean;
  perceivedStress: number;
  situation: "struggling" | "tight" | "stable" | "comfortable";
  mainGoal: string | null;
  behaviorTraits: string[];
  coachingTone?: "calm" | "direct" | "structured" | "gentle";
  currency: string;
  locale?: string;
  aiReady: boolean;
}

export async function DailyInsightCard(props: DailyInsightCardProps) {
  const t = await getTranslations("dashboard.dailyInsight");
  const tInsight = await getTranslations("dashboard.insights");
  const insight = generateLocalInsight({
    ...props,
    coachingTone: props.coachingTone,
  });

  const toneAccent =
    insight.tone === "warning"
      ? "from-[hsl(var(--warning)/0.12)]"
      : insight.tone === "positive"
        ? "from-[hsl(var(--success)/0.12)]"
        : "from-[hsl(var(--gold)/0.12)]";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-[hsl(var(--gold)/0.25)] bg-gradient-to-br via-card/40 to-card/40",
        toneAccent,
      )}
    >
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[hsl(var(--gold))]">
            <Sparkles className="h-4 w-4" />
            <p className="text-[11px] font-medium uppercase tracking-[0.22em]">
              {t("eyebrow")}
            </p>
          </div>
          {props.aiReady ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.coach}>
                {t("deepen")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold leading-snug sm:text-xl">
            {tInsight(insight.headlineKey, insight.params)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tInsight(insight.bodyKey, insight.params)}
          </p>
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          {insight.metric && insight.metricLabelKey && (
            <div className="inline-flex flex-col rounded-xl border border-border/60 bg-background/60 px-4 py-2.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {tInsight(insight.metricLabelKey)}
              </span>
              <span className="mt-0.5 font-display text-base font-semibold text-[hsl(var(--gold))]">
                {insight.metric}
              </span>
            </div>
          )}
          <div className="flex min-w-0 flex-1 items-start gap-2.5 rounded-xl border border-border/60 bg-background/40 px-4 py-2.5">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]">
              <Target className="h-3 w-3" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("nextAction")}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug">
                {tInsight(insight.nextActionKey, insight.params)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
