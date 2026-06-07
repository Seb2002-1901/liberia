"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  bandTheme,
  classifyDelta,
  confidencePillTone,
  formatDelta,
  ringArcOffset,
} from "@/lib/calculations/health/ui-helpers";
import type {
  Band,
  Confidence,
} from "@/lib/calculations/health/types";
import { cn } from "@/lib/utils";

interface HealthScoreRingProps {
  /** Display score 0-100. */
  score: number;
  /** Signed delta vs previous sealed snapshot. null on first ever. */
  delta: number | null;
  confidence: Confidence;
  band: Band;
  isDemo: boolean;
  onOpen: () => void;
}

/**
 * Phase 3.2 / 3.3.1 — Ring the user sees first on the dashboard.
 *
 * 140×140 SVG : track + arc filled to the score, band-colored. Center
 * shows the integer score in tabular-nums semibold ; a delta chip
 * sits underneath. Badges decorate the corners (DEMO + confidence).
 * Permanent label "Financial Health Score" sits below the ring so
 * the KPI identifies itself in under a second.
 *
 * Sized up in 3.3.1 from 80 → 112 → 140 so the headline KPI dominates
 * the dashboard like WHOOP / Apple Health rings. Still fits on a
 * 320px mobile viewport with breathing room.
 *
 * Animation : arc grows from 0 to its target value on FIRST mount of
 * the session only (sessionStorage flag). Subsequent renders snap to
 * the value — no jitter on re-hydration.
 *
 * Click anywhere → opens the drawer via onOpen().
 */
export function HealthScoreRing({
  score,
  delta,
  confidence,
  band,
  isDemo,
  onOpen,
}: HealthScoreRingProps) {
  const t = useTranslations("dashboard.health.ring");
  const tBands = useTranslations("dashboard.health.bands");
  const tConfidence = useTranslations("dashboard.health.drawer.confidence");

  const theme = bandTheme(band, confidence);
  // Phase 3.3.1 iteration 2 — bump 112 → 140, stroke widened in
  // proportion, radius tuned so the arc thickness stays balanced.
  const RADIUS = 46;
  const STROKE = 12;
  const { circumference, offset } = ringArcOffset(score, RADIUS);

  const animateOnMount = useFirstSessionMount("health-ring-mounted");
  const deltaSign = classifyDelta(delta);
  const deltaText = formatDelta(delta);

  // Compose a rich aria-label : screen readers announce score + band
  // + delta + confidence in one sentence so the user gets the same
  // synthesis the visual viewer gets.
  const ariaParts = [
    t("aria", { score }),
    tBands(band),
    delta !== null && delta !== 0
      ? delta > 0
        ? t("ariaDeltaUp", { n: delta })
        : t("ariaDeltaDown", { n: Math.abs(delta) })
      : null,
    confidence !== "HIGH" ? tConfidence(confidence) : null,
    isDemo ? t("ariaDemo") : null,
  ].filter(Boolean) as string[];
  const ariaLabel = ariaParts.join(". ");

  return (
    <div className="flex flex-col items-center gap-2">
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="group relative inline-flex h-[140px] w-[140px] shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <svg
        viewBox="0 0 100 100"
        className="h-[140px] w-[140px] -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-border/40"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={
            animateOnMount ? { strokeDashoffset: circumference } : undefined
          }
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: animateOnMount ? 0.6 : 0, ease: "easeOut" }}
          className={cn(theme.arc, "transition-colors")}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "text-5xl font-semibold tabular-nums leading-none",
            theme.neutral && "text-muted-foreground",
          )}
        >
          {score}
        </span>
        {deltaText && (
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 text-xs tabular-nums",
              deltaSign === "POSITIVE" && "text-emerald-500",
              deltaSign === "NEGATIVE" && "text-rose-500",
              deltaSign === "STABLE" && "text-muted-foreground",
            )}
          >
            {deltaText}
          </span>
        )}
      </div>

      {isDemo && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 rounded bg-[hsl(var(--gold))] px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background"
        >
          {t("demoBadge")}
        </span>
      )}

      {confidence !== "HIGH" && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-1 -right-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            confidencePillTone(confidence),
          )}
        >
          {t(`confidence.${confidence}`)}
        </span>
      )}
    </button>
    <p className="text-xs font-medium text-muted-foreground">
      {t("permanentLabel")}
    </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Session-bound mount flag                                                   */
/* -------------------------------------------------------------------------- */

function useFirstSessionMount(key: string): boolean {
  const [first, setFirst] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const flag = window.sessionStorage.getItem(key);
      if (!flag) {
        window.sessionStorage.setItem(key, "1");
        setFirst(true);
      }
    } catch {
      // Storage unavailable (private mode etc.) — fall back to no animation
    }
  }, [key]);
  return first;
}
