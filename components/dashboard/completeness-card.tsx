"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ClipboardList, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CompletionAssistant } from "@/components/dashboard/completion-assistant";
import type {
  CompletenessResult,
  FinancialArea,
} from "@/lib/calculations/completeness";
import { cn } from "@/lib/utils";

interface CompletenessCardProps {
  completeness: CompletenessResult;
  currency: string;
  className?: string;
}

/**
 * Phase 3.1.5 — dashboard surface for the data-quality score.
 *
 * Two purposes:
 *   1. Show the user the freshness of their profile in one number.
 *   2. Drive them into the CompletionAssistant when categories are
 *      missing so the rest of the dashboard (Économies potentielles,
 *      coach, opportunities) becomes trustworthy.
 *
 * Tone palette per spec: 90+ green · 70-89 gold · <70 orange-red.
 * Empty state (no missing): shows the cap with a celebratory tile.
 */
export function CompletenessCard({
  completeness,
  currency,
  className,
}: CompletenessCardProps) {
  const t = useTranslations("dashboard.completeness");
  const tArea = useTranslations("dashboard.completeness.area");
  const [open, setOpen] = React.useState(false);

  const tone = toneFor(completeness.reliability);
  // Top 3 missing — keep the card calm rather than dumping a 10-line
  // list on the dashboard. The full list lives in the modal.
  const topMissing = completeness.missing.slice(0, 3);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-md",
          className,
        )}
      >
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 -z-10 bg-gradient-to-br opacity-50",
            tone.gradient,
          )}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("eyebrow")}
            </p>
            <div className="flex items-baseline gap-3">
              <p className="font-display text-4xl font-semibold tabular-nums">
                {completeness.score}
                <span className="text-xl text-muted-foreground">%</span>
              </p>
              <p className={cn("text-sm font-medium", tone.label)}>
                {t(`quality.${completeness.reliability}`)}
              </p>
            </div>
            {topMissing.length === 0 ? (
              <p className="max-w-md text-sm text-muted-foreground">
                {t("emptyState")}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("missingLabel")}
                </p>
                <ul className="space-y-1 text-sm">
                  {topMissing.map((m) => (
                    <li key={m.area} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          severityDot(m.severity),
                        )}
                      />
                      {tArea(m.area)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card/60 text-foreground/80"
          >
            {completeness.missing.length === 0 ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <ClipboardList className="h-6 w-6" />
            )}
          </div>
        </div>
        {completeness.missing.length > 0 && (
          <div className="mt-4 flex">
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={() => setOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              {t("cta")}
            </Button>
          </div>
        )}
      </motion.div>

      <CompletionAssistant
        open={open}
        onOpenChange={setOpen}
        missing={completeness.missing as FinancialArea[] | readonly { area: FinancialArea; severity: "low" | "medium" | "high" }[]}
        currency={currency}
      />
    </>
  );
}

function toneFor(r: CompletenessResult["reliability"]): {
  gradient: string;
  label: string;
} {
  if (r === "high") {
    return {
      gradient: "from-emerald-500/40 to-emerald-500/5",
      label: "text-emerald-600",
    };
  }
  if (r === "medium") {
    return {
      gradient: "from-[hsl(var(--gold)/0.45)] to-[hsl(var(--gold-muted)/0.1)]",
      label: "text-[hsl(var(--gold))]",
    };
  }
  return {
    gradient: "from-rose-500/40 to-rose-500/5",
    label: "text-rose-500",
  };
}

function severityDot(s: "low" | "medium" | "high"): string {
  if (s === "high") return "bg-rose-500";
  if (s === "medium") return "bg-[hsl(var(--gold))]";
  return "bg-foreground/40";
}
