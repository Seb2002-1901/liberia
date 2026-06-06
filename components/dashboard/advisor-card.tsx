"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ClipboardList, Sparkles, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CompletionAssistant } from "@/components/dashboard/completion-assistant";
import type { NextAction } from "@/lib/calculations/next-action";
import type { AdvisorSummary } from "@/lib/calculations/advisor-engine";
import type { MissingArea } from "@/lib/calculations/completeness";
import { cn, formatCurrency } from "@/lib/utils";

interface AdvisorCardProps {
  /** Full advisor summary — drives the hero, the priority list and the confidence chip. */
  summary: AdvisorSummary;
  /** Used by the embedded CompletionAssistant when primaryAction triggers it. */
  missing: readonly MissingArea[];
  /** Forwarded so the next-action CTA shape (openCompletion vs navigate) stays in one place. */
  cta: NextAction["cta"];
  /** First name for the greeting. */
  firstName: string;
  currency: string;
}

/**
 * Phase 3.1.11 — Advisor hero card.
 *
 * Replaces NextActionCard on the dashboard as the single point of
 * focus. Three slots in a calm vertical layout:
 *   1. Personalised greeting + "after analysing your situation"
 *   2. PRIORITY #1: title + body + impact line + CTA
 *   3. Up to 2 secondary priorities as compact chips
 *
 * Tone keyed off the primary action's priority. Confidence chip
 * shows alongside the priority tag — same UX vocabulary as 3.1.10.
 */
export function AdvisorCard({
  summary,
  missing,
  cta,
  firstName,
  currency,
}: AdvisorCardProps) {
  const t = useTranslations("dashboard.advisor");
  const tAction = useTranslations("dashboard.nextAction.kind");
  const tConfidence = useTranslations("dashboard.nextAction.confidence");
  const tPriority = useTranslations("dashboard.nextAction.priority");

  const [assistantOpen, setAssistantOpen] = React.useState(false);

  const primary = summary.primaryAction;
  const tone = toneFor(primary.priority);
  const Icon = iconFor(primary.kind);

  // Localise currency-valued fields before passing the payload to
  // the i18n template (mirrors the NextActionCard logic).
  const payload = React.useMemo(() => {
    const out: Record<string, string | number> = { ...primary.payload };
    for (const key of ["amount", "limit"]) {
      const v = out[key];
      if (typeof v === "number") {
        out[key] = formatCurrency(v, currency);
      }
    }
    return out;
  }, [primary.payload, currency]);

  const ctaLabel = cta ? tAction(cta.labelKey) : null;

  const onCtaClick = (e: React.MouseEvent) => {
    if (cta?.type === "openCompletion") {
      e.preventDefault();
      setAssistantOpen(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md"
      >
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 -z-10 bg-gradient-to-br opacity-50",
            tone.gradient,
          )}
        />

        <p className="text-sm text-muted-foreground">
          {t("greeting", { firstName })}
        </p>
        <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
          {t("afterAnalysis")}
        </p>

        <div className="mt-4 flex items-start gap-4">
          <div
            aria-hidden
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              tone.iconBg,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("primaryLabel")}
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  tone.badge,
                )}
              >
                {tPriority(primary.priority)}
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  summary.confidence === "HIGH"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : summary.confidence === "MEDIUM"
                      ? "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]"
                      : "bg-rose-500/10 text-rose-500",
                )}
              >
                {tConfidence(summary.confidence)}
              </span>
            </div>
            <p className="text-base font-semibold leading-snug">
              {tAction(`${primary.kind}`, payload)}
            </p>
            <p className="text-sm text-muted-foreground">
              {tAction(
                deriveBodyKey(primary.kind, primary.payload),
                payload,
              )}
            </p>
            {primary.monthlyImpact > 0 && (
              <p className="text-xs font-medium text-foreground/80">
                {t("impactLine", {
                  monthly: formatCurrency(primary.monthlyImpact, currency),
                  yearly: formatCurrency(primary.monthlyImpact * 12, currency),
                })}
              </p>
            )}
            {cta && ctaLabel && (
              <div className="pt-1">
                {cta.type === "navigate" ? (
                  <Button asChild variant="gold" size="sm">
                    <Link href={cta.href}>
                      {ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={onCtaClick}
                  >
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Secondary priorities — list the 2 OTHER actions calmly so
            the user sees the broader picture without losing focus on
            the primary CTA. */}
        {summary.priorities.length > 1 && (
          <div className="mt-4 border-t border-border/40 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("nextPriorities")}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {summary.priorities
                .filter((p) => p.kind !== primary.kind)
                .slice(0, 2)
                .map((p, i) => {
                  const subPayload: Record<string, string | number> = {
                    ...p.payload,
                  };
                  for (const key of ["amount", "limit"]) {
                    const v = subPayload[key];
                    if (typeof v === "number") {
                      subPayload[key] = formatCurrency(v, currency);
                    }
                  }
                  return (
                    <li
                      key={`${p.kind}-${i}`}
                      className="flex items-start gap-2"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                          p.priority === "high"
                            ? "bg-rose-500"
                            : p.priority === "medium"
                              ? "bg-[hsl(var(--gold))]"
                              : "bg-foreground/40",
                        )}
                      />
                      <span className="text-muted-foreground">
                        {tAction(`${p.kind}.title`, subPayload)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
      </motion.div>

      {cta?.type === "openCompletion" && (
        <CompletionAssistant
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
          missing={missing}
          currency={currency}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function deriveBodyKey(titleKey: string, payload: Record<string, unknown>): string {
  // complete_profile uses bodyLow / bodyMedium depending on score.
  if (titleKey === "complete_profile.title") {
    const score = typeof payload.score === "number" ? payload.score : 0;
    return score < 70 ? "complete_profile.bodyLow" : "complete_profile.bodyMedium";
  }
  // act_on_opportunity.<kind>.title → swap to .body
  if (titleKey.endsWith(".title")) {
    return titleKey.replace(/\.title$/, ".body");
  }
  return titleKey;
}

function iconFor(kind: string) {
  if (kind.startsWith("complete_profile")) return ClipboardList;
  if (kind.startsWith("set_first_goal") || kind.startsWith("build_emergency_fund"))
    return Target;
  return Sparkles;
}

function toneFor(priority: "low" | "medium" | "high") {
  if (priority === "high") {
    return {
      gradient: "from-rose-500/40 to-rose-500/5",
      iconBg: "bg-rose-500/15 text-rose-500",
      badge: "bg-rose-500/10 text-rose-500",
    };
  }
  if (priority === "medium") {
    return {
      gradient: "from-[hsl(var(--gold)/0.4)] to-[hsl(var(--gold-muted)/0.1)]",
      iconBg: "bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]",
      badge: "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]",
    };
  }
  return {
    gradient: "from-emerald-500/30 to-emerald-500/5",
    iconBg: "bg-emerald-500/15 text-emerald-500",
    badge: "bg-secondary/40 text-foreground/70",
  };
}
