import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Désinscription",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  let result: "ok" | "invalid" | "config" = "invalid";
  if (!isAdminConfigured()) {
    result = "config";
  } else if (token && typeof token === "string" && token.length > 8) {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("user_settings")
      .update({ email_weekly_summary: false })
      .eq("email_unsubscribe_token", token)
      .select("user_id")
      .maybeSingle();
    if (!error && data) result = "ok";
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container py-6">
        <BrandMark />
      </div>
      <div className="container my-auto max-w-md text-center">
        {result === "ok" ? (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
              Désinscription
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              C'est fait.
            </h1>
            <p className="mt-3 text-muted-foreground">
              Tu ne recevras plus le récap hebdomadaire de LIBERIA. Tu peux le
              réactiver à tout moment depuis tes paramètres.
            </p>
          </>
        ) : result === "config" ? (
          <>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Service indisponible
            </h1>
            <p className="mt-3 text-muted-foreground">
              La désinscription par lien n'est pas configurée sur cet
              environnement. Ouvre directement tes paramètres pour gérer tes
              préférences emails.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Lien invalide
            </h1>
            <p className="mt-3 text-muted-foreground">
              Ce lien de désinscription n'est pas reconnu. Ouvre tes paramètres
              dans LIBERIA pour gérer tes préférences emails.
            </p>
          </>
        )}
        <Button asChild variant="gold" size="lg" className="mt-7">
          <Link href="/">Retour à LIBERIA</Link>
        </Button>
      </div>
    </div>
  );
}
