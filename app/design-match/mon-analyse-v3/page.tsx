/**
 * Phase 6.0 — Maquette V3 désactivée temporairement (route redirigée).
 *
 * Cette page V3 (`mon-analyse-v3`) était une maquette statique sans
 * connexion backend. Aucune page prod dédiée "Mon analyse" n'existe
 * encore (le score et l'analyse vivent dans le dashboard). L'URL
 * redirige donc vers `/dashboard`, qui contient déjà la ScoreCard,
 * la roadmap et l'historique du score — l'équivalent réel le plus
 * proche aujourd'hui.
 *
 * Le design V3 d'origine reste consultable dans l'historique git.
 *
 * Cible : `/dashboard` (équivalent réel disponible).
 */
import { redirect } from "next/navigation";

export default function MonAnalyseV3RedirectPage(): never {
  redirect("/dashboard");
}
