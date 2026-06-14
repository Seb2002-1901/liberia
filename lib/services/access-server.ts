import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sprint S2-BIS — helper page-side.
 *
 * Différent de requirePremiumAccess (qui retourne {ok, reasonKey} pour
 * les server actions / API routes). Ici on veut un test booléen pour
 * gater l'affichage d'une page premium au niveau RSC : si le compte est
 * `lapsed` / `none` / `past_due`, on rend un soft-paywall (lecture
 * limitée + CTA upgrade) au lieu du contenu complet.
 *
 * Distingue trois états :
 *  - "premium" : trialing | active → accès complet
 *  - "lapsed"  : canceled | paused | unpaid | incomplete | past_due → CTA
 *  - "none"    : pas de subscription row → CTA + onboarding billing
 */
export type AccessState = "premium" | "lapsed" | "none";

export async function getAccessState(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccessState> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  const status = data?.status as string | null | undefined;
  if (status === "trialing" || status === "active") return "premium";
  if (!status) return "none";
  return "lapsed";
}
