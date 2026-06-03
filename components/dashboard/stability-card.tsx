"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getStabilityTier, type ScoreTierColor } from "@/lib/calculations/finance";

interface StabilityCardProps {
  score: number;
  className?: string;
}

export function StabilityCard({ score, className }: StabilityCardProps) {
  const t = useTranslations("dashboard.stability");
  const tier = getStabilityTier(score);
  const angle = (Math.min(Math.max(score, 0), 100) / 100) * 360;

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
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[hsl(var(--gold)/0.06)] blur-3xl"
        aria-hidden
      />
      <div className="relative flex items-center gap-6">
        <ScoreRing score={score} angle={angle} color={tier.color} />
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t("label")}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-4xl font-semibold gold-text">
              {score}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <p className="text-sm font-medium">{t(`tiers.${tier.color}.label`)}</p>
          <p className="text-xs text-muted-foreground">
            {t(`tiers.${tier.color}.description`)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ScoreRing({
  score,
  angle,
  color: tierColor,
}: {
  score: number;
  angle: number;
  color: ScoreTierColor;
}) {
  const color =
    tierColor === "gold"
      ? "hsl(var(--gold))"
      : tierColor === "success"
      ? "hsl(var(--success))"
      : tierColor === "warning"
      ? "hsl(var(--warning))"
      : tierColor === "danger"
      ? "hsl(var(--destructive))"
      : "hsl(var(--foreground))";

  return (
    <div className="relative h-24 w-24 shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${color} ${angle}deg, hsl(var(--secondary)) 0deg)`,
        }}
      />
      <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-card">
        <span className="font-display text-xl font-semibold">{score}</span>
      </div>
    </div>
  );
}
