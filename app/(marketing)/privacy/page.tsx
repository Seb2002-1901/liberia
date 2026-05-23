import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment LIBERIA traite tes données.",
};

export default function PrivacyPage() {
  return (
    <article className="container max-w-3xl py-16 prose prose-invert prose-headings:font-display prose-headings:tracking-tight">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        Légal
      </p>
      <h1>Politique de confidentialité</h1>
      <p className="text-sm text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>

      <h2>1. Données collectées</h2>
      <p>
        LIBERIA ne collecte que les informations strictement nécessaires à son fonctionnement :
        adresse email, mot de passe haché, et données financières que tu choisis volontairement
        de saisir (revenus, dépenses, objectifs).
      </p>

      <h2>2. Stockage</h2>
      <p>
        Les données sont stockées sur l'infrastructure Supabase (UE), chiffrées en transit et au repos.
        Chaque utilisateur n'a accès qu'à ses propres données grâce aux règles Row-Level Security.
      </p>

      <h2>3. Aucune revente</h2>
      <p>
        Nous ne vendons, ne louons et ne partageons jamais tes données avec des tiers à des fins
        publicitaires ou commerciales.
      </p>

      <h2>4. Tes droits</h2>
      <p>
        Conformément au RGPD, tu peux à tout moment exporter ou supprimer définitivement
        ton compte et l'ensemble de tes données depuis la page Paramètres.
      </p>

      <h2>5. Contact</h2>
      <p>
        Pour toute question liée à tes données : <strong>privacy@liberia.app</strong>
      </p>
    </article>
  );
}
