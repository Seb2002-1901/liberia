"use server";

/**
 * Server action utilitaire pour la landing /design-match/coach-v3.
 *
 * Crée une conversation puis (si un texte est fourni dans le FormData)
 * insère immédiatement ce texte comme PREMIER message utilisateur de
 * la conversation. Cela rend les suggestions chips et le textarea de la
 * landing réellement actionnables : le user voit son message déjà
 * envoyé en arrivant sur /coach/{id}, comme ChatGPT.
 *
 * En cas d'échec d'insertion du seed (rate-limit, validation), on
 * redirige quand même vers /coach/{id} — l'utilisateur pourra re-taper.
 */

import { redirect } from "next/navigation";
import { createConversation } from "@/app/actions/conversations";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const MAX_SEED_CHARS = 2000;

export async function startNewConversationAction(
  formData?: FormData,
): Promise<void> {
  const result = await createConversation();
  if (!result.ok) return;
  const conversationId = result.data.id;

  // Si un message graine est fourni par le composer / les suggestions,
  // on l'insère comme premier message utilisateur. On vérifie l'auth
  // et on tronque au-delà de MAX_SEED_CHARS. Aucune validation pseudo-
  // métier ici : la modération applicative se fait à l'API /api/ai/chat
  // qui sera appelée par le client au prochain rendu.
  const rawSeed = formData?.get("seed");
  const seed =
    typeof rawSeed === "string" ? rawSeed.trim().slice(0, MAX_SEED_CHARS) : "";

  if (seed.length > 0 && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from("ai_messages").insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          content: seed,
        });
      }
    } catch (err) {
      console.error("[startNewConversationAction] seed insert failed", err);
    }
  }

  redirect(`/coach/${conversationId}`);
}
