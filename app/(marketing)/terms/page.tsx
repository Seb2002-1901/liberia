import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Les règles d'usage de LIBERIA.",
};

export default function TermsPage() {
  return (
    <article className="container max-w-3xl py-16 prose prose-invert prose-headings:font-display prose-headings:tracking-tight">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        Légal
      </p>
      <h1>Conditions générales d'utilisation</h1>
      <p className="text-sm text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>

      <h2>1. Objet</h2>
      <p>
        LIBERIA est un outil de pilotage financier personnel. Il propose des indicateurs et
        des visualisations pour t'aider à comprendre ta situation.
      </p>

      <h2>2. Pas de conseil financier</h2>
      <p>
        Les informations affichées par LIBERIA <strong>ne constituent pas un conseil
        financier, fiscal, juridique ou d'investissement</strong>. Pour toute décision
        importante, consulte un professionnel agréé.
      </p>

      <h2>3. Utilisation</h2>
      <p>
        Tu t'engages à utiliser le service de bonne foi, à ne pas tenter d'accéder à des
        données qui ne t'appartiennent pas et à ne pas perturber le fonctionnement de la
        plateforme.
      </p>

      <h2>4. Comptes</h2>
      <p>
        Tu es responsable de la confidentialité de ton mot de passe. Tu peux supprimer
        ton compte à tout moment depuis les paramètres.
      </p>

      <h2>5. Abonnement Premium</h2>
      <p>
        L'abonnement Premium est facturé en avance, sans engagement. Tu peux le résilier
        à tout moment ; il reste actif jusqu'à la fin de la période payée.
      </p>

      <h2>6. Modifications</h2>
      <p>
        Ces conditions peuvent évoluer. Tu es notifié·e par email en cas de modification
        substantielle.
      </p>
    </article>
  );
}
