import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { MonthlyDelta } from "@/lib/calculations/kpi-delta";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S3.1 — KpiCard pixel-perfect maquette dashboard.png.
 *
 * Spec visuelle stricte :
 *   - Carte blanche `rounded-2xl shadow-card p-6`
 *   - Caption uppercase `tracking-[0.2em] text-[10px]`
 *   - Chiffre `text-2xl lg:text-3xl font-bold tabular-nums`
 *   - Delta en pastille colorée à droite :
 *       `bg-success/10 rounded-md px-1.5 py-0.5 text-success`
 *       (ou destructive pour mauvaise nouvelle sémantique)
 *   - Sous-ligne `text-xs text-muted-foreground`
 *   - Animation fade-in au mount
 *
 * Sémantique du delta (polarité) :
 *   - "income-like" : hausse = vert (bonne nouvelle)
 *   - "expense-like" : baisse = vert (bonne nouvelle)
 *   - "neutral" : pas de coloration sémantique
 *
 * Empty states : value="—", delta=null → pastille grise "—".
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
    // Phase 5.0 S3.1 v7 — reconstruction densité : p-4 → p-3.5,
    // min-h 100 → 88, marges internes resserrées. Chiffre
    // conservé à text-2xl/[28px] pour lisibilité.
    <article className="flex min-h-[88px] flex-col justify-between rounded-2xl border border-border bg-card p-3.5 shadow-card animate-fade-in">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="font-display text-xl font-bold leading-none tabular-nums text-foreground lg:text-[26px]">
          {value}
        </p>
        <DeltaBadge delta={delta ?? null} polarity={polarity} />
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </article>
  );
}

function DeltaBadge({
  delta,
  polarity,
}: {
  delta: MonthlyDelta | null;
  polarity: KpiPolarity;
}) {
  if (!delta || delta.direction === "neutral" || delta.percent === null) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  const sentiment = sentimentFor(delta.direction, polarity);
  // Pastille colorée : fond /10, texte plein. Maquette dashboard.png.
  const bg =
    sentiment === "good"
      ? "bg-success/10"
      : sentiment === "bad"
        ? "bg-destructive/10"
        : "bg-muted";
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
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        bg,
        fg,
      )}
    >
      <Icon className="h-3 w-3" />
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
