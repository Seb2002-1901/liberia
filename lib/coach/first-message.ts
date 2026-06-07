/**
 * Phase 4.0 J5 — Premier message coach (J0).
 *
 * Pur. Aucun appel LLM. Le message est déterministe et stocké une
 * seule fois par utilisateur — l'idempotence est gérée par la
 * colonne `model` de la table ai_messages : si une row avec
 * model = WELCOME_MESSAGE_MODEL_TAG existe déjà pour le user,
 * l'insertion est skipée.
 *
 * Format respecté à la lettre selon la spec produit :
 *   Salut {firstName}.
 *   J'ai regardé ta situation.
 *   Ta priorité actuelle : {missionLabel}.
 *   On peut commencer par là si tu veux.
 *
 * 4 lignes, séparées par "\n\n" pour un rendu Markdown propre dans
 * le composant chat (paragraphes distincts mais texte court).
 */

/**
 * Tag stable utilisé comme valeur de la colonne `model` dans
 * ai_messages. Ne pas modifier sans migration des rows existantes —
 * la détection d'idempotence en dépend.
 */
export const WELCOME_MESSAGE_MODEL_TAG = "liberia-onboarding-template";

export interface BuildFirstCoachMessageInput {
  /** Salutation déjà i18n-rendue. Exemple : "Salut Alice." */
  greeting: string;
  /** Phrase de constat. Exemple : "J'ai regardé ta situation." */
  reflection: string;
  /** Ligne priorité. Exemple : "Ta priorité actuelle : Constitue
   *  un premier coussin de sécurité." */
  priorityLine: string;
  /** Invitation à discuter. Exemple : "On peut commencer par là si
   *  tu veux." */
  invitation: string;
}

/**
 * Construit le contenu Markdown du premier message coach à partir
 * des 4 chunks déjà i18n-rendus. Concaténation simple par "\n\n".
 *
 * Garanties :
 *   - Toujours 4 paragraphes
 *   - Aucune ligne vide à l'intérieur d'un paragraphe
 *   - Trim final pour éviter les blancs traînants
 */
export function buildFirstCoachMessage(
  input: BuildFirstCoachMessageInput,
): string {
  return [
    input.greeting.trim(),
    input.reflection.trim(),
    input.priorityLine.trim(),
    input.invitation.trim(),
  ]
    .join("\n\n")
    .trim();
}
