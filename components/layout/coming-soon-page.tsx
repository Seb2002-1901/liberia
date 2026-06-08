import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 5.0 S2 — page stub "Bientôt disponible".
 *
 * Utilisée pour les 3 nouvelles routes (Épargne / Investissements /
 * Opportunités) dont la sidebar montre déjà l'entrée (D3 validé)
 * mais dont le contenu sera livré en S4 (Épargne / Opportunités)
 * et S5 (Investissements).
 *
 * Aucune fausse donnée. Aucun fake KPI. Le stub explique :
 *   1. ce que la page va faire (1 phrase)
 *   2. quand elle arrivera (vague mais honnête)
 *   3. comment continuer à avancer en attendant (CTA Coach IA)
 *
 * Visuellement aligné avec le design system Phase 5.0 : carte
 * blanche centrée, hairline, icône dans un badge bleu accent,
 * CTA primaire bleu plein.
 */

interface ComingSoonPageProps {
  /** Icône Lucide à afficher en tête (composant React). */
  icon: React.ComponentType<{ className?: string }>;
  /** Eyebrow uppercase au-dessus du titre. */
  eyebrow: string;
  /** Titre principal de la page. */
  title: string;
  /** Description courte de ce que la page apportera. */
  description: string;
  /** Petit teasing de ce que l'utilisateur va trouver ici. */
  teaser: string;
  /** Label du bouton CTA secondaire vers le coach. */
  coachCta: string;
}

export function ComingSoonPage({
  icon: Icon,
  eyebrow,
  title,
  description,
  teaser,
  coachCta,
}: ComingSoonPageProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-12 text-center">
      <span
        aria-hidden
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
      >
        <Icon className="h-6 w-6" />
      </span>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="w-full rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {teaser}
      </div>
      <Button asChild variant="default" size="lg">
        <Link href={ROUTES.coach}>
          {coachCta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
