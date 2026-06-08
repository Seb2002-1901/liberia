import Link from "next/link";
import { ArrowRight, PieChart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { CategoryBreakdownRow } from "@/lib/calculations/analytics";
import { buildDonutSlices } from "@/lib/ui/svg-charts";
import { EXPENSE_CATEGORIES, ROUTES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Phase 5.0 S3 — Carte "Répartition des dépenses" (Bloc 4, milieu).
 *
 * Reproduit la maquette : donut SVG natif avec total au centre +
 * légende 5 lignes (Logement / Alimentation / Transport / Assurances /
 * Loisirs & divers) avec pourcentage et montant absolu. Lien
 * "Voir le détail →" vers /expenses/analytics.
 *
 * Server Component — aucun état. Consomme `monthCategoryBreakdown`
 * (déjà calculé). SVG fait-main (Q5 validée), pas de dépendance.
 *
 * Empty state : si toutes les catégories sont à 0 → donut grisé +
 * message "Aucune dépense ce mois-ci" + CTA vers /expenses.
 */

interface RepartitionDonutCardProps {
  breakdown: CategoryBreakdownRow[];
  totalExpenses: number;
  currency: string;
}

/** Palette qualitative pour les 5+ catégories (les couleurs de la
 *  maquette : navy, bleu accent, vert, ambre, violet doux). Ordre
 *  stable pour la lisibilité — la légende suit la même séquence. */
const SLICE_COLORS = [
  "hsl(var(--navy))",        // Logement (35%)
  "hsl(var(--primary))",     // Alimentation (20%)
  "hsl(var(--success))",     // Transport (15%)
  "hsl(var(--warning))",     // Assurances (10%)
  "hsl(265 70% 60%)",        // Loisirs & divers (violet doux) — token
                              // ad-hoc, à promouvoir en --accent-violet
                              // au prochain sprint si besoin.
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
      <article className="rounded-2xl border border-border bg-card p-5">
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
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
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
    <article className="rounded-2xl border border-border bg-card p-5">
      <Eyebrow t={t} />
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div
          aria-hidden
          className="relative shrink-0"
          style={{ width: 140, height: 140 }}
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
            <p className="font-display text-base font-semibold text-foreground tabular-nums">
              {formatCurrency(totalExpenses, currency)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("centerLabel")}
            </p>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5 text-sm">
          {slices.map((s, i) => {
            const label =
              EXPENSE_CATEGORIES.find((c) => c.id === s.id)?.label ?? s.id;
            return (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 truncate">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                  />
                  <span className="truncate text-foreground">{label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {Math.round(s.percent)}%{" "}
                  <span className="text-foreground/70">
                    · {formatCurrency(s.value, currency)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-4">
        <Link
          href={ROUTES.expenseAnalytics}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t("eyebrow")}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("period")}</p>
    </div>
  );
}
