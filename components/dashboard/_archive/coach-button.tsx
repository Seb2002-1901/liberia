import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 3.1.12 — CTA full-width "Parler à mon conseiller".
 *
 * Bouton unique en bas de dashboard. Remplace l'ancienne CoachTeaser
 * qui dupliquait toutes les insights déjà résumées dans AdvisorCard.
 * Charge mentale = 0 : un libellé, une flèche, une intention.
 */
export async function CoachButton() {
  const t = await getTranslations("dashboard.coachButton");

  return (
    <Link
      href={ROUTES.coach}
      className="group flex items-center justify-between rounded-2xl border border-border/60 bg-gradient-to-br from-[hsl(var(--gold)/0.15)] to-[hsl(var(--gold)/0.04)] px-6 py-5 transition-colors hover:from-[hsl(var(--gold)/0.22)] hover:to-[hsl(var(--gold)/0.08)]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--gold)/0.18)] text-[hsl(var(--gold))]">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">{t("title")}</p>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
