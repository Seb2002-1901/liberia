/**
 * Phase 6.0 — /dashboard redirige vers /design-match/dashboard-v3.
 *
 * Décision produit (11 juin 2026, post-audit) : le Dashboard V3 navy
 * premium (`/design-match/dashboard-v3`) est la VRAIE version validée
 * visuellement. La page Phase 5 prod qui vivait ici n'est plus servie.
 *
 * Le code Phase 5 prod (ScoreCard, PriorityCard, MissionCard partagés)
 * reste disponible dans l'historique git (avant ce redirect). Toutes
 * les routes prod (/incomes, /expenses, etc.) continuent d'utiliser
 * la layout (app)/ + AppShell — seule la page index /dashboard est
 * désormais un alias vers la V3.
 *
 * Conséquence pour le routing :
 *   - Sidebar AppShell "Tableau de bord" → /dashboard → V3
 *   - URL directe /dashboard → V3
 *   - URL directe /design-match/dashboard-v3 → V3
 *   - Une seule expérience visuelle.
 *
 * Cible : /design-match/dashboard-v3
 */
import { redirect } from "next/navigation";

export default function DashboardIndexRedirect(): never {
  redirect("/design-match/dashboard-v3");
}
