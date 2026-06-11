/**
 * Phase 6.0 — Maquette V3 désactivée temporairement (route redirigée).
 *
 * Cette page V3 (`epargne-v3`) était une maquette statique sans
 * connexion backend. Pour éviter d'exposer deux expériences pour la
 * même fonctionnalité, l'URL redirige désormais vers la route prod
 * réelle. Le design V3 d'origine reste consultable dans l'historique
 * git (commit précédant la désactivation).
 *
 * Cible : `/savings` (page prod, stub ComingSoon pour le moment).
 */
import { redirect } from "next/navigation";

export default function EpargneV3RedirectPage(): never {
  redirect("/savings");
}
