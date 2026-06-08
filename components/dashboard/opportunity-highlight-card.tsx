import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import type { Opportunity, OpportunityPriority } from "@/lib/calculations/opportunities";
import { UpwardArrowIllustration } from "@/components/dashboard/upward-arrow-illustration";
import { EXPENSE_CATEGORIES, ROUTES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Phase 5.0 S3.1 — OpportunityHighlightCard pixel-perfect maquette
 * dashboard.png.
 *
 * Spec visuelle stricte :
 *   - Carte blanche `rounded-2xl shadow-card p-6`
 *   - Eyebrow "OPPORTUNITÉ DU MOMENT" + icône Sparkles vert dans
 *     pastille `bg-success/10 ring-1 ring-success/15`
 *   - Badge "Le plus grand impact pour vous" en pastille verte
 *     `bg-success/12 px-3 py-1 rounded-full`
 *   - Titre `text-lg lg:text-xl font-semibold leading-snug`
 *   - Argument sub-line muted
 *   - Bloc impact en encadré : `bg-success/5 border border-success/20
 *     rounded-lg p-3` avec mapping déterministe high=12 / medium=7 / low=3
 *     points (heuristique éditoriale assumée — voir K2 résolution
 *     audit S3.1, ce n'est PAS un calcul FHS réel)
 *   - **Illustration UpwardArrowIllustration à droite** (signature maquette)
 *   - Bouton bleu `size="default"` "Explorer comment →"
 *   - Animation fade-in au mount
 *
 * Empty state : aucune opportunité détectée → carte rassurante avec
 * check vert.
 */

interface OpportunityHighlightCardProps {
  opportunity: Opportunity | null;
  currency: string;
}

/**
 * Mapping déterministe priorité → points estimés. ATTENTION : ceci
 * est une heuristique éditoriale, PAS un calcul d'impact FHS réel.
 * Documenté ici pour traçabilité (résolution K2, audit S3.1).
 */
const POINTS_BY_PRIORITY: Record<OpportunityPriority, number> = {
  high: 12,
  medium: 7,
  low: 3,
};

export async function OpportunityHighlightCard({
  opportunity,
  currency,
}: OpportunityHighlightCardProps) {
  const t = await getTranslations("dashboard.opportunityHighlight");
  const tKind = await getTranslations("app.finance.analytics.opportunities.kind");

  if (!opportunity) {
    return (
      <article className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success ring-1 ring-success/15"
          >
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("eyebrow")}
          </p>
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold leading-snug text-foreground">
          {t("emptyTitle")}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("emptyBody")}</p>
        <Button asChild variant="outline" size="default" className="mt-4">
          <Link href={ROUTES.plan}>
            {t("emptyCta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </article>
    );
  }

  // Localise le payload (montants + catégorie label) avant rendu.
  const catLabel =
    typeof opportunity.payload.category === "string"
      ? EXPENSE_CATEGORIES.find((c) => c.id === opportunity.payload.category)
          ?.label ?? (opportunity.payload.category as string)
      : null;
  const payloadForI18n: Record<string, string | number> = {
    ...opportunity.payload,
    category: catLabel ?? (opportunity.payload.category as string | undefined) ?? "",
    amount:
      typeof opportunity.payload.amount === "number"
        ? formatCurrency(opportunity.payload.amount, currency)
        : "",
    limit:
      typeof opportunity.payload.limit === "number"
        ? formatCurrency(opportunity.payload.limit, currency)
        : "",
  };
  const estimatedPoints = POINTS_BY_PRIORITY[opportunity.priority];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
      {/* Illustration flèche verte décorative en arrière-plan droit.
          Décorative pure, ne capture pas les clics. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-4 top-12 hidden text-success sm:block"
        style={{ width: 96, height: 96, opacity: 0.85 }}
      >
        <UpwardArrowIllustration className="h-full w-full" />
      </div>

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success ring-1 ring-success/15"
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("eyebrow")}
          </p>
        </div>

        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-[11px] font-semibold text-success">
          <CheckCircle2 className="h-3 w-3" />
          {t("badgeImpact")}
        </p>

        <h3 className="mt-4 max-w-[70%] font-display text-lg font-semibold leading-snug text-foreground sm:max-w-[65%] lg:text-xl">
          {tKind(`${opportunity.kind}.title`, payloadForI18n)}
        </h3>
        <p className="mt-2 max-w-[70%] text-sm text-muted-foreground sm:max-w-[65%]">
          {tKind(`${opportunity.kind}.body`, payloadForI18n)}
        </p>

        {/* Bloc impact en encadré vert. Le chiffrage en points est
            une HEURISTIQUE ÉDITORIALE (high=12/medium=7/low=3),
            PAS un calcul FHS réel. Ne PAS modifier sans repenser
            la promesse produit (K2 audit S3.1). */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs font-medium text-foreground">
          <span className="text-muted-foreground">{t("impactLabel")}</span>
          <span className="font-semibold text-success">
            {t("pointsLabel", { points: estimatedPoints })}
          </span>
        </div>

        <Button asChild variant="default" size="default" className="mt-5">
          <Link href={ROUTES.coach}>
            {t("cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
