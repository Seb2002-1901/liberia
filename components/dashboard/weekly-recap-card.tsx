import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ListChecks,
  Target,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { WeeklyRecap } from "@/lib/recap/weekly";

interface WeeklyRecapCardProps {
  recap: WeeklyRecap;
}

export async function WeeklyRecapCard({ recap }: WeeklyRecapCardProps) {
  const t = await getTranslations("dashboard.weeklyRecap");
  const delta = recap.entriesThisWeek - recap.entriesPreviousWeek;
  const deltaText =
    recap.entriesPreviousWeek > 0
      ? delta > 0
        ? t("deltaUp", { delta })
        : delta < 0
          ? t("deltaDown", { delta })
          : t("deltaSame")
      : null;

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
            {t("eyebrow")}
          </p>
          {deltaText && (
            <span
              className={cn(
                "text-[11px] uppercase tracking-[0.14em]",
                delta > 0
                  ? "text-[hsl(var(--success))]"
                  : delta < 0
                    ? "text-muted-foreground"
                    : "text-muted-foreground",
              )}
            >
              {deltaText}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Metric
            icon={<Calendar className="h-3.5 w-3.5" />}
            value={recap.activeDays}
            label={recap.activeDays > 1 ? t("activeDays") : t("activeDay")}
          />
          <Metric
            icon={<ListChecks className="h-3.5 w-3.5" />}
            value={recap.entriesThisWeek}
            label={recap.entriesThisWeek > 1 ? t("entries") : t("entry")}
          />
          <Metric
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            value={recap.stepsCompletedThisWeek}
            label={recap.stepsCompletedThisWeek > 1 ? t("steps") : t("step")}
          />
        </div>

        <div className="space-y-2.5">
          <Row
            iconClassName="bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]"
            icon={<CheckCircle2 className="h-3 w-3" />}
            label={t("victoryLabel")}
            text={recap.victory}
          />
          <Row
            iconClassName="bg-secondary text-foreground"
            icon={<Target className="h-3 w-3" />}
            label={t("nextPriorityLabel")}
            text={recap.nextPriority}
          />
        </div>

        <QuickActions
          checkin={t("actions.checkin")}
          viewPlan={t("actions.viewPlan")}
          myGoals={t("actions.myGoals")}
        />
      </CardContent>
    </Card>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-1.5 text-[hsl(var(--gold))]">
        <span className="shrink-0">{icon}</span>
        <span className="truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function Row({
  icon,
  iconClassName,
  label,
  text,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  label: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/40 p-3">
      <span
        className={cn(
          "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          iconClassName,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium leading-snug">{text}</p>
      </div>
    </div>
  );
}

function QuickActions({
  checkin,
  viewPlan,
  myGoals,
}: {
  checkin: string;
  viewPlan: string;
  myGoals: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="gold" size="sm">
        <Link href={ROUTES.coach}>
          {checkin}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={ROUTES.plan}>{viewPlan}</Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href={ROUTES.goals}>{myGoals}</Link>
      </Button>
    </div>
  );
}
