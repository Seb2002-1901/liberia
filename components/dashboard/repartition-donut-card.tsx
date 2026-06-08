import Link from "next/link";
import { ArrowRight, PieChart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { CategoryBreakdownRow } from "@/lib/calculations/analytics";
import { buildDonutSlices } from "@/lib/ui/svg-charts";
import { EXPENSE_CATEGORIES, ROUTES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Phase 5.0 S3.1 v7 — RepartitionDonutCard — fix bug overflow légende.
 *
 * Bug v6 (carte plus étroite que la maquette → 3 cols dashboard) :
 * la légende débordait, montants "5 500 CHF" / "3 193 CHF" coupés
 * ou wrappés. La structure flex `justify-between` ne contraignait
 * pas correctement le label vs montants.
 *
 * Fix v7 :
 *   - Donut 144 → 120 px (libère ~24 px pour la légende)
 *   - Donut centre : text-lg → text-sm (tient dans inner ring 68 px)
 *   - Légende : flex `justify-between` → CSS grid 3 colonnes
 *     `[minmax(0,1fr) auto auto]`
 *     · col 1 : dot + label (truncate UNIQUEMENT le label)
 *     · col 2 : percent (auto, ne wrap jamais)
 *     · col 3 : montant CHF (auto, ne wrap jamais)
 *   - `<ul>` parent : ajout `min-w-0` (autorise compression dans flex)
 *   - Légende text-sm → text-xs (plus de densité, lisible)
 *   - tabular-nums sur tous les chiffres (alignement vertical)
 *
 * Résultat : aucun overflow horizontal. Le label tronque
 * proprement quand l'espace manque ; les montants restent
 * toujours visibles intacts.
 */

interface RepartitionDonutCardProps {
  breakdown: CategoryBreakdownRow[];
  totalExpenses: number;
  currency: string;
}

const SLICE_COLORS = [
  "hsl(var(--navy))",
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--chart-coral))",
  "hsl(var(--chart-violet))",
  "hsl(215 30% 70%)",
  "hsl(180 50% 50%)",
  "hsl(45 90% 55%)",
];

export async function RepartitionDonutCard({
  breakdown,
  totalExpenses,
  currency,
}: RepartitionDonutCardProps) {
  const t = await getTranslations("dashboard.repartition");

  const nonZero = breakdown
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  if (nonZero.length === 0 || totalExpenses === 0) {
    return (
      <article className="rounded-2xl border border-border bg-card p-5 shadow-card animate-fade-in">
        <Eyebrow t={t} />
        <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
          <span
            aria-hidden
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <PieChart className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-foreground">
            {t("emptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground">{t("emptyBody")}</p>
          <Link
            href={ROUTES.expenses}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
          >
            {t("emptyCta")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </article>
    );
  }

  const slices = buildDonutSlices(
    nonZero.map((r) => ({ id: r.category, value: r.total })),
    { thickness: 16 },
  );

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card animate-fade-in">
      <Eyebrow t={t} />
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-4">
        {/* Donut — 120 × 120, shrink-0 */}
        <div
          aria-hidden
          className="relative shrink-0"
          style={{ width: 120, height: 120 }}
        >
          <svg viewBox="0 0 100 100" className="h-full w-full">
            {slices.map((s, i) => (
              <path
                key={s.id}
                d={s.pathD}
                fill={SLICE_COLORS[i % SLICE_COLORS.length]}
              />
            ))}
          </svg>
          {/* Centre du donut — text-sm fit dans inner ring 68 px */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display text-sm font-bold tabular-nums text-foreground">
              {formatCurrency(totalExpenses, currency)}
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("centerLabel")}
            </p>
          </div>
        </div>

        {/*
          Légende — CSS grid 3 colonnes anti-overflow :
            col 1  [minmax(0,1fr)]  dot + label (truncate)
            col 2  [auto]            percent (jamais wrap, tabular-nums)
            col 3  [auto]            montant CHF (jamais wrap, tabular-nums)

          `min-w-0` sur le <ul> autorise la compression dans le flex
          parent. `truncate` est appliqué UNIQUEMENT au texte label.
        */}
        <ul className="w-full min-w-0 flex-1 space-y-1.5 text-xs">
          {slices.map((s, i) => {
            const label =
              EXPENSE_CATEGORIES.find((c) => c.id === s.id)?.label ?? s.id;
            return (
              <li
                key={s.id}
                className="grid items-baseline gap-x-2"
                style={{ gridTemplateColumns: "minmax(0, 1fr) auto auto" }}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0 rounded-sm"
                    style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                  />
                  <span className="truncate text-foreground">{label}</span>
                </span>
                <span className="font-medium tabular-nums text-foreground">
                  {Math.round(s.percent)}%
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(s.value, currency)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-5">
        <Link
          href={ROUTES.expenseAnalytics}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
        >
          {t("detailLink")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

function Eyebrow({
  t,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t("eyebrow")}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("period")}</p>
    </div>
  );
}
