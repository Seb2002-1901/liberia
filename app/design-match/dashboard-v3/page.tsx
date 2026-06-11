/**
 * Phase 6.0 — dashboard-v3 désactivée (audit zéro-tolérance).
 *
 * Cette page V3 était la seule encore "live" parmi les 13 maquettes
 * design-match. Audit produit du 11 juin 2026 a révélé :
 *
 *   1. Doublon avec /dashboard (deux UIs pour les mêmes données).
 *   2. Sidebar interne V3 non cliquable (13 NavItems en <div>),
 *      contradiction avec l'AppShell réel de l'app authentifiée.
 *   3. Clés i18n cassées rendues comme texte technique à l'écran :
 *        - dashboard.scoreCard.tier.bands.<band> (n'existe pas — la
 *          bonne clé est dashboard.health.drawer.bands.<band>)
 *        - dashboard.firstMission.title (namespace n'existe pas — la
 *          bonne structure est dashboard.firstMission.<priority>.title)
 *        - app.finance.analytics.opportunities.kind.<kind>.argument
 *          (devrait être .body)
 *
 * Décision : une seule expérience utilisateur visible pour le
 * Tableau de bord. La source de vérité unique est `/dashboard` (page
 * prod sous (app)/, rendue dans l'AppShell, composants partagés,
 * i18n stable, déjà brancée aux mêmes données live que la V3).
 *
 * Le design "navy premium" de la V3 reste une référence visuelle
 * disponible dans l'historique git (commit 61791cf avant ce
 * redirect). Toute future refonte visuelle de /dashboard devra
 * adopter ce design en plaçant le rendu DANS /dashboard, pas dans
 * une route parallèle.
 *
 * Cible : `/dashboard`.
 */
import { redirect } from "next/navigation";

export default function DashboardV3RedirectPage(): never {
  redirect("/dashboard");
}
