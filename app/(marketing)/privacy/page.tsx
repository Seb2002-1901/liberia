import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment LIBERIA traite tes données — collecte minimale, hébergement UE, pas de revente, contrôle complet côté utilisateur.",
};

export default function PrivacyPage() {
  return (
    <article className="container max-w-3xl py-16 prose prose-invert prose-headings:font-display prose-headings:tracking-tight">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        Légal
      </p>
      <h1>Politique de confidentialité</h1>
      <p className="text-sm text-muted-foreground">
        Dernière mise à jour : {new Date().toLocaleDateString("fr-CH")}
      </p>

      <h2>1. Notre principe</h2>
      <p>
        On collecte le minimum nécessaire au fonctionnement de LIBERIA — rien
        de plus. Tes données ne sont jamais vendues, jamais louées, jamais
        partagées à des fins publicitaires.
      </p>

      <h2>2. Données collectées</h2>
      <p>
        <strong>Compte :</strong> adresse email, mot de passe haché (jamais
        stocké en clair), prénom optionnel.
      </p>
      <p>
        <strong>Données financières :</strong> revenus, dépenses, objectifs,
        notes — uniquement ce que tu choisis volontairement de saisir.
        LIBERIA ne se connecte jamais à ta banque.
      </p>
      <p>
        <strong>Préférences :</strong> style de coaching, profil
        comportemental, traits déclarés en onboarding, notes personnelles.
      </p>
      <p>
        <strong>Conversations avec l&apos;assistant :</strong> tes messages et
        les réponses sont conservés pour que tu retrouves ton historique.
      </p>
      <p>
        <strong>Compteurs internes anonymes :</strong> nombre de connexions,
        usage des fonctionnalités, agrégats jamais nominatifs. Désactivables
        depuis tes paramètres.
      </p>

      <h2>3. Hébergement et stockage</h2>
      <p>
        Les données sont stockées sur l&apos;infrastructure Supabase (région
        UE), chiffrées en transit (TLS) et au repos (AES-256 géré par
        Supabase). L&apos;isolation par utilisateur est appliquée au niveau
        PostgreSQL via Row-Level Security — chaque utilisateur n&apos;accède
        qu&apos;à ses propres données.
      </p>

      <h2>4. Paiements</h2>
      <p>
        Les paiements transitent par Stripe (conforme PCI niveau 1). LIBERIA
        ne stocke jamais ton numéro de carte — uniquement un identifiant
        d&apos;abonnement pour synchroniser ton statut Premium. Tu peux
        consulter et mettre à jour ton moyen de paiement depuis le portail
        client Stripe accessible dans tes paramètres.
      </p>

      <h2>5. Intelligence artificielle</h2>
      <p>
        Quand tu utilises l&apos;assistant IA ou génères un plan, un snapshot
        minimal de ton contexte financier et de tes préférences est envoyé à
        Anthropic pour produire une réponse. Anthropic n&apos;utilise pas ces
        données pour entraîner ses modèles (voir{" "}
        <Link href={ROUTES.aiPolicy}>notre politique IA</Link>). Quand
        l&apos;IA n&apos;est pas active, LIBERIA utilise un générateur local
        — aucune donnée ne quitte alors notre infrastructure.
      </p>

      <h2>6. Cookies</h2>
      <p>
        LIBERIA n&apos;utilise que des cookies strictement nécessaires :
        cookie de session Supabase pour ton authentification. Pas de cookie
        publicitaire, pas de cookie de tracking tiers, pas de bannière à
        accepter.
      </p>

      <h2>7. Tes droits (RGPD)</h2>
      <ul>
        <li>
          <strong>Accès et portabilité :</strong> tu peux télécharger
          l&apos;intégralité de tes données au format JSON depuis{" "}
          <Link href={ROUTES.settings}>tes paramètres</Link>.
        </li>
        <li>
          <strong>Suppression :</strong> tu peux supprimer définitivement
          ton compte en deux clics — toutes tes données sont effacées en
          cascade.
        </li>
        <li>
          <strong>Rectification :</strong> tu modifies tes données toi-même
          depuis l&apos;application.
        </li>
        <li>
          <strong>Opposition :</strong> tu peux désactiver les compteurs
          internes anonymes depuis tes paramètres.
        </li>
      </ul>

      <h2>8. Durée de conservation</h2>
      <p>
        Tes données sont conservées tant que ton compte est actif. À la
        suppression du compte, l&apos;effacement est définitif et
        irréversible (sauf certaines obligations légales de conservation
        comptable côté Stripe, indépendantes de LIBERIA).
      </p>

      <h2>9. Aucune revente, aucun partage commercial</h2>
      <p>
        On ne vend pas tes données. On ne les loue pas. On ne les partage
        avec aucun annonceur, courtier, agence marketing ou broker de
        données. C&apos;est notre engagement, et ça reste vrai même quand
        LIBERIA grandira.
      </p>

      <h2>10. Sous-traitants</h2>
      <p>
        Les seuls tiers qui traitent tes données pour notre compte sont :
        Supabase (hébergement + base de données, UE), Stripe (paiements,
        UE/US), Anthropic (modèle IA, US — uniquement les snapshots de
        conversation), Resend (livraison email, UE/US), Vercel (hébergement
        applicatif, UE/US). Tous opèrent sous nos instructions et selon des
        clauses contractuelles types RGPD.
      </p>

      <h2>11. Contact</h2>
      <p>
        Pour toute question liée à tes données :{" "}
        <strong>privacy@liberia.app</strong>. Pour signaler un problème de
        sécurité : <strong>security@liberia.app</strong>.
      </p>
    </article>
  );
}
