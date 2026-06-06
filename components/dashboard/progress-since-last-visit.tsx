"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AdvisorSummary } from "@/lib/calculations/advisor-engine";

interface ProgressSinceLastVisitProps {
  summary: AdvisorSummary;
}

/**
 * Phase 3.1.11 — "Depuis ta dernière visite" compact card.
 *
 * Surface the activity the user generated in the last 7 days so the
 * app feels alive ("LIBERIA a suivi ton évolution"). Hidden when
 * there's no recent activity — silence beats a misleading "nothing
 * happened yet" stamp.
 *
 * No table snapshot needed — the engine derives this from the
 * created_at timestamps already on expenses / goals / budgets /
 * memory_entries.
 */
export function ProgressSinceLastVisit({ summary }: ProgressSinceLastVisitProps) {
  const t = useTranslations("dashboard.advisor");
  const tProgress = useTranslations("dashboard.advisor.progress");

  if (summary.progressSinceLastVisit.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Activity
          aria-hidden
          className="h-3.5 w-3.5 text-emerald-500"
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("progressTitle")}
        </p>
      </div>
      <ul className="space-y-1.5 text-sm">
        {summary.progressSinceLastVisit.map((e, i) => (
          <li
            key={`${e.kind}-${i}`}
            className="flex items-start gap-2 text-muted-foreground"
          >
            <span
              aria-hidden
              className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-500"
            />
            <span>{tProgress(e.kind, e.payload)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
