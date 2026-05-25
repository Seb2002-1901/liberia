import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Conditions générales",
  description:
    "Les règles d'usage de LIBERIA — essai gratuit, abonnement sans engagement, annulation à tout moment.",
};

export default function TermsPage() {
  return (
    <article className="container max-w-3xl py-16 prose prose-invert prose-headings:font-display prose-headings:tracking-tight">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        Légal
      </p>
      <h1>Conditions générales d&apos;utilisation</h1>
      <p className="text-sm text-muted-foreground">
        Dernière mise à jour : {new Date().toLocaleDateString("fr-CH")}
      </p>

      <h2>1. Objet</h2>
      <p>
        LIBERIA est un outil de pilotage financier personnel destiné à
        t&apos;aider à comprendre ta situation, structurer ton budget et
        avancer vers tes objectifs. L&apos;application est éditée à Genève
        (Suisse) et conçue principalement pour le marché suisse, avec un
        usage international possible.
      </p>

      <h2>2. Pas de conseil financier</h2>
      <p>
        Les indicateurs, scores, plans et recommandations affichés par
        LIBERIA — qu&apos;ils proviennent du générateur local ou de
        l&apos;assistant IA — <strong>ne constituent pas un conseil financier,
        fiscal, juridique ou d&apos;investissement</strong>. Ils n&apos;émanent
        pas d&apos;un professionnel agréé. Avant toute décision importante,
        consulte un conseiller adapté à ta situation. Voir aussi notre{" "}
        <Link href={ROUTES.legal}>disclaimer complet</Link>.
      </p>

      <h2>3. Compte utilisateur</h2>
      <p>
        Tu dois avoir au moins 18 ans (ou l&apos;âge légal de majorité dans
        ta juridiction) pour créer un compte. Tu es responsable de la
        confidentialité de ton mot de passe et de l&apos;activité sur ton
        compte. Tu peux supprimer ton compte à tout moment depuis tes
        paramètres — la suppression est définitive et irréversible.
      </p>

      <h2>4. Essai gratuit et abonnement</h2>
      <p>
        LIBERIA est proposé avec un essai gratuit de 14 jours. Un moyen de
        paiement valide est requis pour démarrer l&apos;essai. À l&apos;issue
        des 14 jours, ton abonnement choisi (mensuel ou annuel) est prélevé
        automatiquement. Tu peux annuler à tout moment depuis ton portail
        d&apos;abonnement — sans justification, sans question.
      </p>
      <p>
        <strong>Anti-abus :</strong> l&apos;essai gratuit est limité à un seul
        par compte. Une nouvelle souscription après annulation démarre
        immédiatement au tarif normal.
      </p>

      <h2>5. Tarifs</h2>
      <ul>
        <li>
          Abonnement mensuel : 14.99 CHF / mois, prélevé chaque mois après les
          14 jours d&apos;essai.
        </li>
        <li>
          Abonnement annuel : 119.99 CHF / an (soit environ 9.99 CHF / mois,
          ≈ 60 CHF d&apos;économie sur l&apos;année), prélevé chaque année.
        </li>
      </ul>
      <p>
        Les prix sont indiqués en francs suisses (CHF), toutes taxes
        comprises. Aucun frais caché.
      </p>

      <h2>6. Annulation et droit de rétractation</h2>
      <p>
        Tu peux annuler ton abonnement à tout moment depuis ton portail
        d&apos;abonnement (Stripe). L&apos;annulation prend effet à la fin de
        la période en cours — ton accès reste actif jusque-là. Aucun
        prélèvement supplémentaire ne sera effectué.
      </p>
      <p>
        Si tu annules pendant les 14 jours d&apos;essai, aucun montant ne
        t&apos;est facturé.
      </p>

      <h2>7. Remboursement</h2>
      <p>
        Étant donné le format service numérique avec accès immédiat, aucun
        remboursement n&apos;est dû une fois la période payée. En cas de
        problème technique majeur t&apos;ayant empêché d&apos;utiliser
        l&apos;application, contacte <strong>support@liberia.app</strong> —
        on étudie chaque cas.
      </p>

      <h2>8. Utilisation acceptable</h2>
      <p>
        Tu t&apos;engages à utiliser LIBERIA de bonne foi : ne pas tenter
        d&apos;accéder à des données qui ne t&apos;appartiennent pas, ne pas
        perturber l&apos;infrastructure, ne pas réutiliser le service à des
        fins frauduleuses. L&apos;utilisation abusive de l&apos;assistant IA
        (volume excessif, contenu hors-cadre) peut entraîner une suspension.
      </p>

      <h2>9. Données et confidentialité</h2>
      <p>
        Voir notre <Link href={ROUTES.privacy}>politique de confidentialité</Link>{" "}
        détaillée. En résumé : collecte minimale, hébergement UE, pas de
        revente, contrôle total côté utilisateur (export RGPD, suppression
        en deux clics).
      </p>

      <h2>10. Responsabilité</h2>
      <p>
        LIBERIA fournit un outil informatif. Nous ne pouvons être tenus
        responsables des conséquences financières d&apos;une décision prise
        sur la base seule des informations affichées dans l&apos;application.
        Toute décision financière importante reste sous ton entière
        responsabilité.
      </p>

      <h2>11. Modifications</h2>
      <p>
        Ces conditions peuvent évoluer. Toute modification substantielle
        (changement de tarif, nouvelle catégorie d&apos;email, modification de
        traitement des données) te sera notifiée par email avec un préavis
        raisonnable. Une utilisation continue après notification vaut
        acceptation.
      </p>

      <h2>12. Droit applicable</h2>
      <p>
        Les présentes conditions sont régies par le droit suisse. Tout litige
        relève de la compétence des tribunaux genevois, sous réserve des
        dispositions impératives de protection du consommateur applicables
        dans ton lieu de résidence habituelle.
      </p>

      <h2>13. Contact</h2>
      <p>
        Pour toute question concernant ton abonnement ou ces conditions :{" "}
        <strong>support@liberia.app</strong>.
      </p>
    </article>
  );
}
