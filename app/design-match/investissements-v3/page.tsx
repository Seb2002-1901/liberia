/**
 * Sprint S1 — décision produit : le module Investissements n'est PAS
 * commercialisable en l'état (aucune table, aucun moteur, aucun feed
 * de données réelles). Plutôt que d'afficher une page "placeholder
 * honnête" qui reste perçue comme une promesse non tenue, on redirige
 * définitivement vers /design-match/epargne-v3 — qui est, dans
 * l'écosystème LIBERIA actuel, la primitive "patrimoine" cohérente.
 *
 * L'item de la sidebar Investissements a été retiré en amont, mais
 * cette route reste accessible par lien direct (legacy URL, bookmarks,
 * SEO). Le redirect évite que le visiteur tombe sur un cul-de-sac.
 *
 * Pas de placeholder. Pas de "bientôt disponible". Pas de promesse
 * non tenue. Redirection nette vers le module utile le plus proche.
 */

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function InvestissementsV3Page(): never {
  redirect("/design-match/epargne-v3");
}
