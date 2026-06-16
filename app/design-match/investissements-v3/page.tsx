/**
 * Sprint S1 — décision produit : le module Investissements n'est PAS
 * commercialisable en l'état. Plutôt qu'un placeholder, on redirige
 * vers /design-match/epargne-v3 (primitive "patrimoine" cohérente).
 *
 * Pas de placeholder, pas de promesse non tenue.
 */

import { redirect } from "next/navigation";

export default function InvestissementsV3Page(): never {
  redirect("/design-match/epargne-v3");
}
