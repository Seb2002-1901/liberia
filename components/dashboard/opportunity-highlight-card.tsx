import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import type { Opportunity } from "@/lib/calculations/opportunities";
import { EXPENSE_CATEGORIES, ROUTES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Phase 5.0 S3 — Carte "Opportunité du moment" (Bloc 4, gauche).
 *
 * Reproduit la maquette : badge vert "Le plus grand impact pour
 * vous", grand titre orienté action, ligne d'argument, ligne
 * d'impact qualitatif (D4 : "Impact potentiel : élevé/moyen/
 * faible" — JAMAIS de chiffrage en pts FHS), illustration discrète,
 * bouton "Explorer comment →" qui pointe vers le coach.
 *
 * Server Component — aucun état. Consomme la 1ère opportunité de
 * `detectOpportunities` (déjà calculée par le moteur Phase 3).
 *
 * Empty state : si aucune opportunité, on rend une carte "fondations
 * en place" avec check vert. Rassurant, jamais alarmant.
 */

interface OpportunityHighlightCardProps {
  opportunity: Opportunity | null;
  currency: string;
}

export async function OpportunityHighlightCard({
  opportunity,
  currency,
}: OpportunityHighlightCardProps) {
  const t = await getTranslations("dashboard.opportunityHighlight");
  const tKind = await getTranslations("app.finance.analytics.opportunities.kind");

  if (!opportunity) {
    return (
      <article className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success"
          >
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("eyebrow")}
          </p>
        </div>
        <h3 className="mt-4 font-display text-base font-semibold leading-snug text-foreground">
          {t("emptyTitle")}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("emptyBody")}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href={ROUTES.plan}>
            {t("emptyCta")}
            <ArrowRight className="h-3.5 w-3.5" />
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

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success"
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("eyebrow")}
        </p>
      </div>

      <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
        {t("badgeImpact")}
      </p>

      <h3 className="mt-3 font-display text-base font-semibold leading-snug text-foreground">
        {tKind(`${opportunity.kind}.title`, payloadForI18n)}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {tKind(`${opportunity.kind}.body`, payloadForI18n)}
      </p>

      {/* Impact qualitatif (D4 : pas de pts FHS). */}
      <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground">
        <TrendingUp className="h-3.5 w-3.5 text-success" />
        {t("impactLabel")}{" "}
        <span className="font-semibold">{t(`impactLevel.${opportunity.priority}`)}</span>
      </p>

      <Button asChild variant="default" size="sm" className="mt-4">
        <Link href={ROUTES.coach}>
          {t("cta")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </article>
  );
}
