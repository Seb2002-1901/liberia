/**
 * Phase 6.0 — /coach redirige vers /design-match/coach-v3.
 *
 * Décision produit (post-restauration du V3 validé) : la version finale
 * validée de la page Coach est /design-match/coach-v3 (visual navy
 * premium, right rail Score / Résumé / Priorité / Actions rapides).
 *
 * Note : si l'utilisateur a déjà des conversations, c'est le coach-v3
 * (Server Component) qui détectera et redirigera vers
 * /coach/{conversationId}. Le double redirect /coach → /coach-v3 →
 * /coach/{id} est server-side et instantané.
 *
 * Cible : /design-match/coach-v3
 */
import { redirect } from "next/navigation";

export default function CoachIndexRedirect(): never {
  redirect("/design-match/coach-v3");
}
