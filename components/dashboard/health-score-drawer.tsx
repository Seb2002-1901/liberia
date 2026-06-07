"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ROUTES } from "@/lib/constants";
import {
  axisBarPct,
  axisBarTone,
  bandTheme,
  classifyDelta,
  confidencePillTone,
  formatDelta,
  isProvisional,
  momentumChip,
} from "@/lib/calculations/health/ui-helpers";
import type { AxisId } from "@/lib/calculations/health/types";
import { AXIS_ORDER } from "@/lib/calculations/health/constants";
import type { DrawerData } from "@/lib/calculations/health/types";
import { cn, formatCurrency } from "@/lib/utils";

interface HealthScoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DrawerData;
  currency: string;
  isDemo?: boolean;
}

/**
 * Phase 3.2 — Drawer that opens when the Ring is tapped.
 *
 * 4 sections, top to bottom :
 *   1. Header  — big score + band label + confidence chip + momentum chip
 *   2. Delta   — "Pourquoi mon score a changé ?" with 1-5 contributors
 *   3. Axes    — 6 axes with bar + score + confidence
 *   4. Reco    — "Pour aller plus haut" + CTA "Parler à mon conseiller"
 *
 * Reads ONE input (DrawerData) — no parallel fetch, no inconsistency
 * between what the ring shows and what the drawer explains.
 */
export function HealthScoreDrawer({
  open,
  onOpenChange,
  data,
  currency,
  isDemo = false,
}: HealthScoreDrawerProps) {
  const t = useTranslations("dashboard.health.drawer");
  const tBands = useTranslations("dashboard.health.bands");
  const { score, momentum, recommendation } = data;
  const theme = bandTheme(score.band, score.confidence);
  const chip = momentumChip(momentum);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {/* Header — DialogTitle and DialogDescription satisfy Radix
            a11y contract ; screen readers announce title + summary
            when the drawer opens. */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <DialogTitle className="text-base font-semibold">
              {t("title")}
            </DialogTitle>
            {isDemo && (
              <span className="rounded bg-[hsl(var(--gold))] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
                {t("demoBadge")}
              </span>
            )}
          </div>
          <DialogDescription className="sr-only">
            {t("ariaDescription", {
              score: score.display,
              band: tBands(score.band),
              confidence: t(`confidence.${score.confidence}`),
            })}
          </DialogDescription>
          <div className="flex flex-wrap items-baseline gap-3">
            <span
              className={cn(
                "text-5xl font-semibold tabular-nums leading-none",
                theme.neutral && "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {score.display}
            </span>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider",
                theme.badge,
              )}
            >
              {isProvisional(score.confidence)
                ? t("bandProvisional")
                : tBands(score.band)}
            </span>
          </div>
          {/* Phase 3.3.1 — micro-explanation under the score when the
              read is provisional. Different angle from the
              completeness hint at the bottom : this one is about
              HISTORY DEPTH, not data coverage. */}
          {isProvisional(score.confidence) && (
            <p className="text-xs text-muted-foreground">
              {t("insufficientExplain")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider",
                confidencePillTone(score.confidence),
              )}
            >
              {t(`confidence.${score.confidence}`)}
            </span>
            {chip && (
              <span className="rounded bg-card/60 px-2 py-0.5 text-muted-foreground">
                {chip.glyph}{" "}
                {t("momentum.label", {
                  weeks: chip.weeks,
                  direction: t(`momentum.${chip.directionKey}`),
                  strength: t(`momentum.${chip.strengthKey}`),
                })}
              </span>
            )}
          </div>
        </header>

        {/* Delta block */}
        <DeltaBlock data={data} />

        {/* Axes decomposition */}
        <AxesDecomposition data={data} />

        {/* Recommendation */}
        {recommendation && (
          <RecommendationBlock
            recommendation={recommendation}
            currency={currency}
          />
        )}

        {score.confidence === "INSUFFICIENT_DATA" && (
          <p className="rounded-xl border border-dashed border-border/50 bg-card/30 p-3 text-xs text-muted-foreground">
            {t("insufficientHint")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Delta block — "Pourquoi mon score a changé ?"                              */
/* -------------------------------------------------------------------------- */

function DeltaBlock({ data }: { data: DrawerData }) {
  const t = useTranslations("dashboard.health.drawer.deltaBlock");
  const tReason = useTranslations("dashboard.health.reason");
  const tAreas = useTranslations("dashboard.health.areas");
  const { delta, score } = data;

  // First-snapshot case : no previous reference.
  if (!delta || score.previousScore === null) {
    return (
      <section className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("title")}
        </h3>
        <p className="rounded-xl border border-border/40 bg-card/30 p-3 text-xs text-muted-foreground">
          {t("firstSnapshot")}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("title")}
      </h3>
      <ul className="space-y-1.5">
        {delta.contributors.map((c, i) => {
          const sign = classifyDelta(c.deltaPoints);
          const chipText = formatDelta(c.deltaPoints) ?? "—";
          const payload: Record<string, string | number> = { ...c.payload };
          if (typeof payload.area === "string") {
            payload.area = tAreas(payload.area);
          }
          return (
            <li
              key={`${c.axis}-${i}`}
              className="flex items-start gap-2 text-sm"
            >
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  sign === "POSITIVE" && "bg-emerald-500/10 text-emerald-500",
                  sign === "NEGATIVE" && "bg-rose-500/10 text-rose-500",
                  sign === "STABLE" && "bg-muted/40 text-muted-foreground",
                )}
              >
                {chipText}
              </span>
              <span className="text-muted-foreground">
                {tReason(c.reasonKey, payload)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="pt-1 text-xs text-foreground/80">
        {delta.netDelta > 0
          ? t("netGain", { value: delta.netDelta })
          : delta.netDelta < 0
            ? t("netLoss", { value: delta.netDelta })
            : t("netStable")}
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Axes decomposition — 6 bars                                                */
/* -------------------------------------------------------------------------- */

function AxesDecomposition({ data }: { data: DrawerData }) {
  const t = useTranslations("dashboard.health.drawer.axes");
  const tLabel = useTranslations("dashboard.health.drawer.axes.labels");
  const tConfidence = useTranslations("dashboard.health.drawer.confidence");
  const [open, setOpen] = React.useState(true);
  const { score } = data;
  const panelId = React.useId();

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span>{t("title")}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <ul id={panelId} className="space-y-2">
          {AXIS_ORDER.map((id: AxisId) => {
            const axis = score.axes[id];
            const pct = axisBarPct(axis.score);
            const tone = axisBarTone(axis.score, axis.confidence);
            return (
              <li key={id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{tLabel(id)}</span>
                  <div className="flex items-center gap-2">
                    {axis.confidence !== "HIGH" && (
                      <span
                        className={cn(
                          "rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                          axis.confidence === "UNKNOWN"
                            ? "bg-muted text-muted-foreground"
                            : axis.confidence === "LOW"
                              ? "bg-rose-500/10 text-rose-500"
                              : "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]",
                        )}
                      >
                        {tConfidence(
                          axis.confidence === "UNKNOWN"
                            ? "INSUFFICIENT_DATA"
                            : axis.confidence,
                        )}
                      </span>
                    )}
                    <span className="tabular-nums text-muted-foreground">
                      {axis.score}/100
                    </span>
                  </div>
                </div>
                <Progress value={pct} indicatorClassName={tone} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Recommendation block — "Pour aller plus haut"                              */
/* -------------------------------------------------------------------------- */

function RecommendationBlock({
  recommendation,
  currency,
}: {
  recommendation: NonNullable<DrawerData["recommendation"]>;
  currency: string;
}) {
  const t = useTranslations("dashboard.health.drawer.recommendation");
  const tReco = useTranslations("dashboard.health.recommendation");
  const payload: Record<string, string | number> = { ...recommendation.payload };
  // Localise currency-valued fields.
  for (const key of ["addAmount"]) {
    const v = payload[key];
    if (typeof v === "number") {
      payload[key] = formatCurrency(v, currency);
    }
  }
  return (
    <section className="space-y-2 rounded-xl border border-border/40 bg-card/30 p-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("title")}
      </h3>
      <p className="text-sm font-semibold">
        {tReco(`${recommendation.titleKey}.title`, payload)}
      </p>
      <p className="text-sm text-muted-foreground">
        {tReco(`${recommendation.titleKey}.desc`, payload)}
      </p>
      {recommendation.estimatedGain !== null &&
        recommendation.estimatedGain > 0 && (
          <p className="text-xs font-medium text-emerald-500">
            {t("estimatedGain", { value: recommendation.estimatedGain })}
          </p>
        )}
      <div className="pt-1">
        <Button asChild variant="gold" size="sm">
          <Link href={ROUTES.coach}>
            {t("ctaCoach")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
