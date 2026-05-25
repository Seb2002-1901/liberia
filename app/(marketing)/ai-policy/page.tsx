import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Politique IA responsable",
  description:
    "Comment LIBERIA utilise l'IA — assistance et coaching, jamais conseil financier réglementé. Pas d'entraînement sur tes données.",
};

export default function AiPolicyPage() {
  return (
    <article className="container max-w-3xl py-16">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        IA responsable
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Une IA qui t&apos;accompagne, pas qui te remplace.
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        L&apos;assistant IA de LIBERIA est conçu pour t&apos;aider à voir clair,
        proposer des actions concrètes et adapter son ton à ton profil. Il
        n&apos;est ni un conseiller financier, ni un thérapeute, ni un oracle.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Ce que fait l&apos;IA
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Lit tes données déclarées.</strong>{" "}
            Revenus, dépenses, objectifs, plan en cours, préférences de
            coaching. Uniquement ce que tu as renseigné toi-même.
          </li>
          <li>
            <strong className="text-foreground">Propose des actions concrètes.</strong>{" "}
            Petites étapes hebdomadaires, ajustements de budget, priorisation
            de dettes. Toujours avec une explication courte du pourquoi.
          </li>
          <li>
            <strong className="text-foreground">Adapte son ton à ton profil.</strong>{" "}
            Calme et rassurant, direct et motivant, structuré ou progressif —
            tu choisis le style dans tes paramètres.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Ce que l&apos;IA ne fait pas
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Aucun conseil réglementé.</strong>{" "}
            Pas de recommandation d&apos;investissement, pas d&apos;optimisation
            fiscale personnalisée, pas de conseil juridique. Pour ces
            sujets, l&apos;assistant te renvoie vers un professionnel agréé.
          </li>
          <li>
            <strong className="text-foreground">Aucune promesse financière.</strong>{" "}
            L&apos;IA ne garantit pas de rendement, ne prédit pas l&apos;avenir
            et ne t&apos;encourage jamais à prendre des risques disproportionnés.
          </li>
          <li>
            <strong className="text-foreground">Aucun jugement.</strong>{" "}
            Le ton est calme, factuel et bienveillant. Pas de culpabilisation,
            pas de pression artificielle.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Tes données et l&apos;IA
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Pas d&apos;entraînement.</strong>{" "}
            Tes données ne servent jamais à entraîner ou ré-entraîner un modèle
            IA, ni le nôtre, ni celui de nos fournisseurs (Anthropic).
          </li>
          <li>
            <strong className="text-foreground">Traitement à la demande.</strong>{" "}
            L&apos;IA ne reçoit tes données qu&apos;au moment où tu lui poses une
            question ou demandes un plan. Le snapshot envoyé est minimal et
            jamais conservé par le fournisseur LLM au-delà du traitement.
          </li>
          <li>
            <strong className="text-foreground">Mode fallback local.</strong>{" "}
            Quand l&apos;assistant n&apos;est pas branché, LIBERIA utilise un
            générateur de réponses déterministe côté serveur — aucune donnée
            ne quitte alors notre infrastructure.
          </li>
          <li>
            <strong className="text-foreground">Effacement complet.</strong>{" "}
            La suppression de ton compte efface l&apos;historique des
            conversations + tous les plans générés. Tu peux aussi supprimer
            une conversation à la fois depuis l&apos;interface.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Limites et erreurs
        </h2>
        <p className="text-sm text-muted-foreground">
          Les modèles IA peuvent se tromper, mal comprendre une nuance ou
          proposer une action inadaptée à ta situation particulière. Avant
          d&apos;agir sur une recommandation importante (rembourser un crédit,
          changer d&apos;assurance, débuter un placement), prends un temps de
          réflexion — et si l&apos;enjeu est significatif, consulte un
          professionnel agréé.
        </p>
        <p className="text-sm text-muted-foreground">
          Tu peux nous signaler une réponse problématique en répondant
          directement à l&apos;email de récap hebdo ou en écrivant à{" "}
          <strong>support@liberia.app</strong>.
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild variant="gold">
          <Link href={ROUTES.security}>
            <Sparkles className="h-4 w-4" />
            Voir la page sécurité
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.privacy}>Politique de confidentialité</Link>
        </Button>
      </div>
    </article>
  );
}
