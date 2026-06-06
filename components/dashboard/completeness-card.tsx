"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Sparkles } from "lucide-react";
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
 * Phase 3.1.7 — compact dashboard surface.
 *
 * Defaults to a calm one-number summary ("80% · Données correctes")
 * with a "Détails" disclosure. Inside the disclosure: the three
 * tiered scores (structurelle / détaillée / optimale) and the top
 * missing categories. The CTA still drives into the
 * CompletionAssistant.
 *
 * Tone palette: 90+ green · 70-89 gold · <70 orange-red.
 */
export function CompletenessCard({
  completeness,
  currency,
  className,
}: CompletenessCardProps) {
  const t = useTranslations("dashboard.completeness");
  const tArea = useTranslations("dashboard.completeness.area");
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const tone = toneFor(completeness.reliability);
  // Limit the missing list inside the disclosure to keep the
  // dashboard tidy. The full list lives in the modal.
  const topMissing = completeness.missing.slice(0, 4);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur-md",
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
          <div className="flex-1 space-y-1.5 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("eyebrow")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="font-display text-3xl font-semibold tabular-nums">
                {completeness.structurelle}
                <span className="text-base text-muted-foreground">%</span>
              </p>
              <p className={cn("text-sm font-medium truncate", tone.label)}>
                {t(`quality.${completeness.reliability}`)}
              </p>
            </div>
          </div>
          <div
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card/60 text-foreground/80"
          >
            {completeness.missing.length === 0 ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <ClipboardList className="h-5 w-5" />
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {completeness.missing.length > 0 && (
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={() => setOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("cta")}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {expanded ? t("hideDetails") : t("details")}
          </Button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
            <div className="grid grid-cols-3 gap-2">
              <ScoreTile
                label={t("scores.structurelle")}
                value={completeness.structurelle}
              />
              <ScoreTile
                label={t("scores.detaillee")}
                value={completeness.detaillee}
              />
              <ScoreTile
                label={t("scores.optimale")}
                value={completeness.optimale}
              />
            </div>
            {topMissing.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
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
              </div>
            )}
          </div>
        )}
      </motion.div>

      <CompletionAssistant
        open={open}
        onOpenChange={setOpen}
        missing={
          completeness.missing as
            | FinancialArea[]
            | readonly { area: FinancialArea; severity: "low" | "medium" | "high" }[]
        }
        currency={currency}
      />
    </>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums">{value}%</p>
    </div>
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
