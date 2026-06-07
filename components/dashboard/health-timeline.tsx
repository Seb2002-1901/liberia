"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { momentumChip } from "@/lib/calculations/health/ui-helpers";
import type {
  DrawerData,
  TimelineEvent,
} from "@/lib/calculations/health/types";
import { cn } from "@/lib/utils";

interface HealthTimelineProps {
  data: DrawerData;
  /** Max events rendered. Spec caps at 10. */
  maxEvents?: number;
}

/**
 * Phase 3.3 — vertical timeline of recent financial events.
 *
 * Mobile-first. No table, no wall of text. Each event is a coloured
 * dot on a left rail with a one-line title + an optional one-line
 * description. Optional impact chip (+4, −2 etc.) on score moves.
 *
 * Reads exclusively from DrawerData ; no recomputation, no async.
 * If the timeline is empty (first snapshot, brand new account) the
 * component renders nothing.
 */
export function HealthTimeline({
  data,
  maxEvents = 10,
}: HealthTimelineProps) {
  const t = useTranslations("dashboard.health.timeline");
  const tEvents = useTranslations("dashboard.health.timeline.event");

  const events = data.timeline?.events.slice(0, maxEvents) ?? [];
  const chip = momentumChip(data.momentum);

  return (
    <section
      aria-label={t("ariaLabel")}
      className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-md sm:p-6"
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("title")}
        </h2>
        {chip && (
          <span
            aria-hidden="true"
            className="text-xs text-muted-foreground"
          >
            {chip.glyph}{" "}
            {t("momentumChip", {
              direction: t(`momentum.${chip.directionKey}`),
              strength: t(`momentum.${chip.strengthKey}`),
            })}
          </span>
        )}
      </header>

      {events.length === 0 ? (
        <TimelineEmptyState />
      ) : (
        <ol className="relative space-y-4 border-l border-border/40 pl-4">
          {events.map((ev, i) => (
            <TimelineRow
              key={`${ev.week}-${ev.type}-${i}`}
              event={ev}
              tEvents={tEvents}
              t={t}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty state — premium, pedagogical, never accusatory                       */
/* -------------------------------------------------------------------------- */

function TimelineEmptyState() {
  const t = useTranslations("dashboard.health.timeline");
  return (
    <div className="relative border-l border-dashed border-border/40 pl-4">
      <span
        aria-hidden="true"
        className="absolute -left-[0.4rem] top-0 inline-block h-2.5 w-2.5 rounded-full border border-border/60 bg-background"
      />
      <p className="text-sm font-medium">{t("emptyTitle")}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("emptyDescription")}
      </p>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("emptyHintsTitle")}
      </p>
      <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
          <span>{t("emptyHint1")}</span>
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
          <span>{t("emptyHint2")}</span>
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
          <span>{t("emptyHint3")}</span>
        </li>
      </ul>
      <span
        aria-hidden="true"
        className="absolute -left-[0.4rem] bottom-0 inline-block h-2.5 w-2.5 rounded-full border border-border/60 bg-background"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Row                                                                        */
/* -------------------------------------------------------------------------- */

function TimelineRow({
  event,
  tEvents,
  t,
}: {
  event: TimelineEvent;
  tEvents: ReturnType<typeof useTranslations>;
  t: ReturnType<typeof useTranslations>;
}) {
  const tone = eventTone(event.type);
  const payload: Record<string, string | number> = {};
  if (event.impact !== null) payload.impact = event.impact;

  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-[1.4rem] mt-1 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background",
          tone.dot,
        )}
      />
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-sm font-medium">
          {tEvents(`${event.titleKey}.title`, payload)}
        </p>
        {event.impact !== null && (event.type === "score_up" || event.type === "score_down") && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              tone.chip,
            )}
          >
            {event.type === "score_up" ? `+${event.impact}` : `${event.impact}`}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {tEvents(`${event.descriptionKey}.description`, payload)}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {t("weekLabel", { week: event.week })}
      </p>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Visual tones                                                               */
/* -------------------------------------------------------------------------- */

function eventTone(type: TimelineEvent["type"]): { dot: string; chip: string } {
  switch (type) {
    case "score_up":
      return {
        dot: "bg-emerald-500",
        chip: "bg-emerald-500/10 text-emerald-500",
      };
    case "score_down":
      return {
        dot: "bg-rose-500",
        chip: "bg-rose-500/10 text-rose-500",
      };
    case "band_changed":
      return {
        dot: "bg-[hsl(var(--gold))]",
        chip: "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]",
      };
    case "runway_improved":
      return {
        dot: "bg-emerald-500/80",
        chip: "bg-emerald-500/10 text-emerald-500",
      };
    case "major_area_added":
      return {
        dot: "bg-foreground/60",
        chip: "bg-muted text-muted-foreground",
      };
    case "goal_created":
    case "goal_completed":
      return {
        dot: "bg-[hsl(var(--gold))]",
        chip: "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]",
      };
    case "recommendation_followed":
      return {
        dot: "bg-emerald-500/60",
        chip: "bg-emerald-500/10 text-emerald-500",
      };
  }
}
