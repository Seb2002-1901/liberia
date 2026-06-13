"use server";

/**
 * Server action utilitaire pour la landing /design-match/coach-v3.
 *
 * Encapsule createConversation() + redirect → /coach/{id}. Permet
 * de wrapper les boutons "Nouvelle conversation" / chips de
 * suggestions / Envoyer composer en simple <form action={…}>.
 *
 * En cas d'échec côté action createConversation (rate-limit, auth,
 * Supabase down) on ne redirige pas — l'utilisateur reste sur la
 * landing. Le flow existant côté createConversation n'est pas
 * touché.
 */

import { redirect } from "next/navigation";
import { createConversation } from "@/app/actions/conversations";

export async function startNewConversationAction(): Promise<void> {
  const result = await createConversation();
  if (result.ok) {
    redirect(`/coach/${result.data.id}`);
  }
}
