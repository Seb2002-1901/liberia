"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Gauge } from "lucide-react";
import type {
  DisciplineResult,
  DisciplineTier,
} from "@/lib/calculations/discipline";
import { cn } from "@/lib/utils";

interface DisciplineCardProps {
  score: number;
  tier: DisciplineTier;
  weakest: DisciplineResult["weakest"];
  className?: string;
}

const TIER_TONE: Record<DisciplineTier, string> = {
  excellent: "from-[hsl(var(--gold)/0.45)] to-[hsl(var(--gold-muted)/0.2)]",
  good: "from-emerald-500/40 to-emerald-500/10",
  fair: "from-amber-500/40 to-amber-500/10",
  low: "from-rose-500/40 to-rose-500/10",
};

export function DisciplineCard({
  score,
  tier,
  weakest,
  className,
}: DisciplineCardProps) {
  const t = useTranslations("dashboard.discipline");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-md",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 bg-gradient-to-br opacity-60",
          TIER_TONE[tier],
        )}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("eyebrow")}
          </p>
          <div className="flex items-baseline gap-3">
            <p className="font-display text-4xl font-semibold tabular-nums">
              {score}
              <span className="text-xl text-muted-foreground">/100</span>
            </p>
            <p className="text-sm font-medium">{t(`tier.${tier}`)}</p>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            {t(`weakest.${weakest}`)}
          </p>
        </div>
        <div
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card/60 text-foreground/80"
        >
          <Gauge className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
}
