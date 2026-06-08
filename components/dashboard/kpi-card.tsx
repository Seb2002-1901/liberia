import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { MonthlyDelta } from "@/lib/calculations/kpi-delta";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S3 — Carte KPI générique (Bloc 3 dashboard).
 *
 * Reproduit fidèlement la maquette : carte blanche, caption
 * uppercase, grand chiffre tabular-nums, badge delta % coloré
 * selon sa "polarité sémantique", sous-ligne contextuelle.
 *
 * Sémantique du delta (D8 + D4 validés) :
 *   - `polarity` = "income-like" : une hausse est positive (vert)
 *   - `polarity` = "expense-like" : une baisse est positive (vert)
 *   - `polarity` = "neutral"      : pas de coloration sémantique
 *
 * Empty states :
 *   - `value` est "—" si données indisponibles
 *   - delta = null OU direction = "neutral" → pas de flèche, "—"
 *   - sous-ligne masquée si elle référence un calcul impossible
 */

export type KpiPolarity = "income-like" | "expense-like" | "neutral";

interface KpiCardProps {
  label: string;
  /** Valeur formatée prête à afficher (ex. "25 000 CHF" ou "—"). */
  value: string;
  /** Delta mensuel calculé. null si pas de comparaison possible. */
  delta?: MonthlyDelta | null;
  /** Polarité sémantique pour colorer le delta (voir sémantique). */
  polarity?: KpiPolarity;
  /** Sous-ligne contextuelle (ex. "63% de vos revenus" ou "Après impôts"). */
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
    <article className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="font-display text-2xl font-semibold text-foreground tabular-nums">
          {value}
        </p>
        <DeltaBadge delta={delta ?? null} polarity={polarity} />
      </div>
      {hint && (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      )}
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
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>—</span>
      </span>
    );
  }
  const isGood = sentimentFor(delta.direction, polarity) === "good";
  const isBad = sentimentFor(delta.direction, polarity) === "bad";
  const tone = isGood
    ? "text-success"
    : isBad
      ? "text-destructive"
      : "text-muted-foreground";
  const Icon = delta.direction === "positive" ? ArrowUpRight : ArrowDownRight;
  const sign = delta.direction === "positive" ? "+" : "-";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", tone)}>
      <Icon className="h-3 w-3" />
      <span className="tabular-nums">
        {sign}
        {delta.percent.toFixed(1)}%
      </span>
    </span>
  );
}

/**
 * Convertit une direction arithmétique + une polarité sémantique
 * en sentiment d'utilisateur ("good" / "bad" / "neutral"). Utilisé
 * pour choisir la couleur du delta.
 *
 * Exemples :
 *   - polarity="income-like", direction="positive" → good (revenus en hausse)
 *   - polarity="expense-like", direction="positive" → bad (dépenses en hausse)
 *   - polarity="expense-like", direction="negative" → good (dépenses en baisse)
 */
function sentimentFor(
  direction: MonthlyDelta["direction"],
  polarity: KpiPolarity,
): "good" | "bad" | "neutral" {
  if (direction === "neutral") return "neutral";
  if (polarity === "neutral") return "neutral";
  if (polarity === "income-like") {
    return direction === "positive" ? "good" : "bad";
  }
  // expense-like
  return direction === "negative" ? "good" : "bad";
}
