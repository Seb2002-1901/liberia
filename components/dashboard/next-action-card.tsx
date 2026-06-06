"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ClipboardList, Sparkles, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CompletionAssistant } from "@/components/dashboard/completion-assistant";
import type { NextAction } from "@/lib/calculations/next-action";
import type { MissingArea } from "@/lib/calculations/completeness";
import type { AdviceConfidence } from "@/lib/calculations/advice-confidence";
import { cn, formatCurrency } from "@/lib/utils";

interface NextActionCardProps {
  action: NextAction;
  /** Pulled from completeness so the embedded modal can sort missing areas. */
  missing: readonly MissingArea[];
  /**
   * Phase 3.1.10 — coach confidence tier surfaced as a small chip
   * beside the priority badge. Lets the user see "Confiance moyenne"
   * before reading the action; coherent with how the coach itself
   * adapts its tone (see lib/ai/context.ts rule block).
   */
  confidence?: AdviceConfidence;
  currency: string;
}

/**
 * Phase 3.1.7 — single hero card on the dashboard.
 *
 * The brief asked for a "Prochaine action recommandée" card with a
 * priority tag, a title, a body and a button. The card is the
 * dashboard's only call-to-action above the fold; everything else
 * is descriptive.
 *
 * Tone keyed off priority:
 *   high   → rose (visible alarm)
 *   medium → gold (lever to consider)
 *   low    → neutral (gentle nudge or healthy "continue")
 *
 * The body line is i18n'd via the action.bodyKey + payload so each
 * kind reads naturally for the user (with formatted amounts when
 * appropriate).
 */
export function NextActionCard({
  action,
  missing,
  confidence,
  currency,
}: NextActionCardProps) {
  const t = useTranslations("dashboard.nextAction");
  const tKind = useTranslations("dashboard.nextAction.kind");
  const [assistantOpen, setAssistantOpen] = React.useState(false);

  const tone = toneFor(action.priority);
  const Icon = iconFor(action.kind);

  const payload = React.useMemo(() => {
    const out: Record<string, string | number> = { ...action.payload };
    for (const key of ["amount", "limit"]) {
      const v = out[key];
      if (typeof v === "number") {
        out[key] = formatCurrency(v, currency);
      }
    }
    return out;
  }, [action.payload, currency]);

  const ctaLabel = action.cta
    ? t(action.cta.labelKey)
    : null;

  const onCtaClick = (e: React.MouseEvent) => {
    if (action.cta?.type === "openCompletion") {
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
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-md",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 -z-10 bg-gradient-to-br opacity-50",
            tone.gradient,
          )}
        />
        <div className="flex items-start gap-4">
          <div
            aria-hidden
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              tone.iconBg,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("eyebrow")}
              </p>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  tone.badge,
                )}
              >
                {t(`priority.${action.priority}`)}
              </span>
              {confidence && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    confidence === "HIGH"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : confidence === "MEDIUM"
                        ? "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]"
                        : "bg-rose-500/10 text-rose-500",
                  )}
                >
                  {t(`confidence.${confidence}`)}
                </span>
              )}
            </div>
            <p className="text-base font-semibold leading-snug">
              {tKind(action.titleKey, payload)}
            </p>
            <p className="text-sm text-muted-foreground">
              {tKind(action.bodyKey, payload)}
            </p>
            {action.monthlyImpact > 0 && (
              <p className="text-xs font-medium text-foreground/80">
                {t("impactLine", {
                  monthly: formatCurrency(action.monthlyImpact, currency),
                  yearly: formatCurrency(action.monthlyImpact * 12, currency),
                })}
              </p>
            )}
            {action.cta && ctaLabel && (
              <div className="pt-1">
                {action.cta.type === "navigate" ? (
                  <Button asChild variant="gold" size="sm">
                    <Link href={action.cta.href}>
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
      </motion.div>

      {action.cta?.type === "openCompletion" && (
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

function iconFor(kind: NextAction["kind"]) {
  switch (kind) {
    case "complete_profile":
      return ClipboardList;
    case "set_first_goal":
    case "build_emergency_fund":
      return Target;
    default:
      return Sparkles;
  }
}

function toneFor(priority: NextAction["priority"]): {
  gradient: string;
  iconBg: string;
  badge: string;
} {
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
