/**
 * Phase 6.0 — Auth guard sur /design-match.
 *
 * Avant Phase 6.0, les routes /design-match/* étaient ouvertes
 * (maquettes design accessibles à n'importe qui sans login). Mais
 * depuis que dashboard-v3 est branché aux vraies données utilisateur
 * et que les autres V3 redirigent vers des routes prod (qui exigent
 * une session), il faut un garde uniforme : un visiteur non
 * authentifié ne doit pas atterrir sur une V3 puis y voir des
 * données fictives sans contexte.
 *
 * Comportement :
 *   - utilisateur authentifié → la page V3 ciblée s'affiche
 *     (dashboard-v3 live ou un des 12 redirects vers route prod)
 *   - non authentifié → redirect vers /login
 *
 * NB : cette protection s'applique à TOUTE sous-route de
 * /design-match, y compris les anciennes maquettes /dashboard-v2 et
 * /dashboard si elles existent encore. C'est volontaire : on ne
 * veut pas que ces UIs soient consultables sans session.
 *
 * Implémentation : `redirect()` de next/navigation jette une exception
 * NEXT_REDIRECT que le framework intercepte — donc on l'appelle hors
 * de tout try/catch. Le try/catch couvre uniquement l'initialisation
 * Supabase (cas dégradé : env preview sans Supabase configuré → on
 * laisse passer plutôt que de bloquer la page).
 */
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

async function getAuthedUserId(): Promise<string | null | "skip"> {
  if (!isSupabaseConfigured()) return "skip";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch (err) {
    console.error("[design-match] auth guard supabase failed", err);
    return "skip";
  }
}

export default async function DesignMatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userIdOrSkip = await getAuthedUserId();
  if (userIdOrSkip === null) {
    // Supabase OK, mais pas de session : on redirige.
    redirect("/login");
  }
  return <>{children}</>;
}
