import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ListChecks,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { WeeklyRecap } from "@/lib/recap/weekly";

interface WeeklyRecapCardProps {
  recap: WeeklyRecap;
}

/**
 * "Cette semaine" — a calm, minimal recap rendered on the dashboard.
 * Surfaces measurable activity (days, entries, plan steps) plus one
 * victory line and one next priority. No badges, no streaks, no
 * gamification — premium consistency only.
 */
export function WeeklyRecapCard({ recap }: WeeklyRecapCardProps) {
  const delta = recap.entriesThisWeek - recap.entriesPreviousWeek;
  const deltaText =
    recap.entriesPreviousWeek > 0
      ? delta > 0
        ? `+${delta} vs semaine précédente`
        : delta < 0
          ? `${delta} vs semaine précédente`
          : "même rythme"
      : null;

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
            Cette semaine
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
            label={recap.activeDays > 1 ? "jours actifs" : "jour actif"}
          />
          <Metric
            icon={<ListChecks className="h-3.5 w-3.5" />}
            value={recap.entriesThisWeek}
            label={recap.entriesThisWeek > 1 ? "mouvements" : "mouvement"}
          />
          <Metric
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            value={recap.stepsCompletedThisWeek}
            // Short label: "étapes validées" overflows the 3-col grid
            // on iPhone SE (320px). Context comes from the "Cette
            // semaine" eyebrow + the icon — short stays clear.
            label={recap.stepsCompletedThisWeek > 1 ? "étapes" : "étape"}
          />
        </div>

        <div className="space-y-2.5">
          <Row
            iconClassName="bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]"
            icon={<CheckCircle2 className="h-3 w-3" />}
            label="On retient"
            text={recap.victory}
          />
          <Row
            iconClassName="bg-secondary text-foreground"
            icon={<Target className="h-3 w-3" />}
            label="Prochaine priorité"
            text={recap.nextPriority}
          />
        </div>

        <QuickActions />
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

/**
 * Compact strip of premium CTAs. Three actions max so the card stays
 * scannable on mobile. None of them are NEW routes — they all link
 * into existing surfaces.
 */
function QuickActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="gold" size="sm">
        <Link href={ROUTES.coach}>
          Faire un check-in
          <ArrowRight className="h-3 w-3" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={ROUTES.plan}>Voir mon plan</Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href={ROUTES.goals}>Mes objectifs</Link>
      </Button>
    </div>
  );
}
