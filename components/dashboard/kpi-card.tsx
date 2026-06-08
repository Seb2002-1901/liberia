import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { MonthlyDelta } from "@/lib/calculations/kpi-delta";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S3.1 v8 — KpiCard recalibré maquette.
 *
 * Changement structurel v8 : RETRAIT des pills colorées (bg-success/10
 * etc.) — la maquette montre des deltas en **texte inline coloré**,
 * pas dans des pastilles. Réduit le bruit visuel et matche le rendu
 * léger de la maquette.
 *
 * Sémantique du delta (polarité) inchangée :
 *   - "income-like" : hausse = vert
 *   - "expense-like" : baisse = vert
 *   - "neutral" : pas de coloration
 */

export type KpiPolarity = "income-like" | "expense-like" | "neutral";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: MonthlyDelta | null;
  polarity?: KpiPolarity;
  hint?: string;
}

export function KpiCard({
  label,
  value,
  delta,
  polarity = "neutral",
  hint,
}: KpiCardProps) {
  return (
    <article className="flex min-h-[88px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-card animate-fade-in">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="font-display text-xl font-bold leading-none tabular-nums text-foreground lg:text-[26px]">
          {value}
        </p>
        <DeltaInline delta={delta ?? null} polarity={polarity} />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </article>
  );
}

/**
 * Delta inline coloré — pas de pill, juste flèche + chiffre coloré.
 * Maquette dashboard.png montre les deltas comme du texte simple
 * coloré à côté du chiffre principal (pas dans une pastille bg).
 */
function DeltaInline({
  delta,
  polarity,
}: {
  delta: MonthlyDelta | null;
  polarity: KpiPolarity;
}) {
  if (!delta || delta.direction === "neutral" || delta.percent === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  const sentiment = sentimentFor(delta.direction, polarity);
  const fg =
    sentiment === "good"
      ? "text-success"
      : sentiment === "bad"
        ? "text-destructive"
        : "text-muted-foreground";
  const Icon = delta.direction === "positive" ? ArrowUpRight : ArrowDownRight;
  const sign = delta.direction === "positive" ? "+" : "-";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-semibold",
        fg,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="tabular-nums">
        {sign}
        {delta.percent.toFixed(1)}%
      </span>
    </span>
  );
}

function sentimentFor(
  direction: MonthlyDelta["direction"],
  polarity: KpiPolarity,
): "good" | "bad" | "neutral" {
  if (direction === "neutral") return "neutral";
  if (polarity === "neutral") return "neutral";
  if (polarity === "income-like") {
    return direction === "positive" ? "good" : "bad";
  }
  return direction === "negative" ? "good" : "bad";
}
