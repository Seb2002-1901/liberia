"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import type { FinancialPlan, FinancialPlanStep } from "@/types/database";

interface PlanProgressProps {
  plan: FinancialPlan;
  steps: FinancialPlanStep[];
}

export function PlanProgress({ plan, steps }: PlanProgressProps) {
  const t = useTranslations("app.plan.progress");
  const total = steps.length;
  const done = steps.filter((s) => s.is_completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-md"
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[hsl(var(--gold)/0.06)] blur-3xl"
        aria-hidden
      />
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--gold))]">
              <Sparkles className="h-3 w-3" />
              {t("eyebrow", { days: plan.horizon_days })}
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {plan.title}
            </h2>
            {plan.summary && (
              <p className="max-w-2xl text-sm text-muted-foreground">{plan.summary}</p>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
            <span>{t("stepsLabel", { done, total })}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>{t("progression")}</span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <Progress
            value={pct}
            indicatorClassName="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-muted))]"
          />
        </div>

        <p className="text-[11px] text-muted-foreground">
          {t("generatedOn", {
            date: formatDate(plan.generated_at),
            model: plan.model ?? t("fallbackModel"),
          })}
        </p>
      </div>
    </motion.div>
  );
}
