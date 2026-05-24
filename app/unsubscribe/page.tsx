import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";
import { UnsubscribeForm } from "@/components/unsubscribe/unsubscribe-form";
import { isAdminConfigured } from "@/lib/supabase/admin";

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

  // GET requests don't unsubscribe by themselves — email link previewers
  // (Gmail, Slack, Twitter, antivirus link checkers) crawl every URL and
  // would auto-trigger the action. The actual unsubscribe happens via a
  // server action invoked by a form submit (POST) inside UnsubscribeForm.

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container py-6">
        <BrandMark />
      </div>
      <div className="container my-auto max-w-md text-center">
        {!isAdminConfigured() ? (
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
        ) : !token ? (
          <>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Lien invalide
            </h1>
            <p className="mt-3 text-muted-foreground">
              Ce lien de désinscription est incomplet. Ouvre tes paramètres
              dans LIBERIA pour gérer tes préférences emails.
            </p>
          </>
        ) : (
          <UnsubscribeForm token={token} />
        )}
        <Button asChild variant="gold" size="lg" className="mt-7">
          <Link href="/">Retour à LIBERIA</Link>
        </Button>
      </div>
    </div>
  );
}
