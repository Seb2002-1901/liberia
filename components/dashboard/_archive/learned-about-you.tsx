"use client";

import * as React from "react";
import { Brain } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  AdvisorObservation,
  AdvisorSummary,
} from "@/lib/calculations/advisor-engine";

interface LearnedAboutYouProps {
  summary: AdvisorSummary;
}

/**
 * Phase 3.1.11 — "Ce que j'ai appris sur toi" compact card.
 *
 * Renders up to 5 observations the advisor engine derived from the
 * static user_memory layer + the dynamic user_memory_entries. Hidden
 * altogether when the list is empty — no point bothering the user
 * with an empty "I haven't learned anything yet" block.
 *
 * Each observation has a stable `kind` so the UI just calls
 * t(`learned.${kind}`, payload). Payloads are pre-prepared by the
 * engine (no formatting needed here).
 */
export function LearnedAboutYou({ summary }: LearnedAboutYouProps) {
  const t = useTranslations("dashboard.advisor");
  const tLearned = useTranslations("dashboard.advisor.learned");

  if (summary.learnedAboutUser.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Brain
          aria-hidden
          className="h-3.5 w-3.5 text-[hsl(var(--gold))]"
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("learnedTitle")}
        </p>
      </div>
      <ul className="space-y-1.5 text-sm">
        {summary.learnedAboutUser.map((o, i) => (
          <ObservationLine key={`${o.kind}-${i}`} obs={o} tLearned={tLearned} />
        ))}
      </ul>
    </div>
  );
}

function ObservationLine({
  obs,
  tLearned,
}: {
  obs: AdvisorObservation;
  tLearned: ReturnType<typeof useTranslations>;
}) {
  return (
    <li className="flex items-start gap-2 text-muted-foreground">
      <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
      <span>{tLearned(obs.kind, obs.payload)}</span>
    </li>
  );
}
