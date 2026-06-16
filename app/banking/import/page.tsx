import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants";
import { ImportClient } from "./import-client";

/**
 * Sprint V5 Banking V1 — page d'import CSV.
 *
 * Acceptée par toutes les banques CH cibles (UBS, PostFinance, Neon,
 * Yuh, Revolut, Raiffeisen, BCV) + générique pour les autres.
 *
 * Auth requise. Onboarding requis. Pas premium-gated (V1 voulu
 * accessible à tous les comptes payants pour adoption rapide).
 */
export const dynamic = "force-dynamic";

export default async function BankImportPage() {
  if (!isSupabaseConfigured()) redirect(ROUTES.login);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  return <ImportClient />;
}
