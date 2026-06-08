import Link from "next/link";
import { ArrowRight, PieChart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { CategoryBreakdownRow } from "@/lib/calculations/analytics";
import { buildDonutSlices } from "@/lib/ui/svg-charts";
import { EXPENSE_CATEGORIES, ROUTES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Phase 5.0 S3.1 — RepartitionDonutCard pixel-perfect maquette
 * dashboard.png.
 *
 * Spec visuelle stricte :
 *   - Carte blanche `rounded-2xl shadow-card p-6`
 *   - Eyebrow "RÉPARTITION DES DÉPENSES" + sous "Ce mois-ci" muted
 *   - Donut SVG natif 160×160 (vs 140 avant)
 *   - Palette stricte maquette : Logement=navy, Alimentation=primary,
 *     Transport=success, Assurances=chart-coral, Loisirs=chart-violet
 *   - Total centre `text-lg font-bold` + caption muted
 *   - Légende droite : dot + label · % · montant (colonnes propres)
 *   - Lien "Voir le détail →" bleu primary
 *   - Animation fade-in au mount
 */

interface RepartitionDonutCardProps {
  breakdown: CategoryBreakdownRow[];
  totalExpenses: number;
  currency: string;
}

/**
 * Palette qualitative stricte (maquette dashboard.png) :
 *   Logement       → navy            (#0F3D9E)
 *   Alimentation   → primary         (#2563EB)
 *   Transport      → success         (#16A34A)
 *   Assurances     → chart-coral     (#ED602F)
 *   Loisirs/Autres → chart-violet    (#9A5CD9)
 * + 3 fallbacks pour catégories supplémentaires éventuelles.
 *
 * L'ordre est appliqué par index (les slices arrivent triées par
 * total décroissant — le top 5 reçoit la palette signature, le
 * reste tombe sur les fallbacks).
 */
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
      <article className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
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
    { thickness: 18 },
  );

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
      <Eyebrow t={t} />
      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        <div
          aria-hidden
          className="relative shrink-0"
          style={{ width: 160, height: 160 }}
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
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display text-lg font-bold tabular-nums text-foreground">
              {formatCurrency(totalExpenses, currency)}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("centerLabel")}
            </p>
          </div>
        </div>
        <ul className="flex-1 space-y-2 text-sm">
          {slices.map((s, i) => {
            const label =
              EXPENSE_CATEGORIES.find((c) => c.id === s.id)?.label ?? s.id;
            return (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                  />
                  <span className="truncate text-foreground">{label}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                  <span className="text-foreground font-medium">
                    {Math.round(s.percent)}%
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(s.value, currency)}
                  </span>
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
