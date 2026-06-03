import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";
import { UnsubscribeForm } from "@/components/unsubscribe/unsubscribe-form";
import { isAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.unsubscribe.metadata");
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const t = await getTranslations("app.unsubscribe");
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container py-6">
        <BrandMark />
      </div>
      <div className="container my-auto max-w-md text-center">
        {!isAdminConfigured() ? (
          <>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {t("serviceUnavailableTitle")}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {t("serviceUnavailableBody")}
            </p>
          </>
        ) : !token ? (
          <>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {t("invalidLinkTitle")}
            </h1>
            <p className="mt-3 text-muted-foreground">{t("invalidLinkBody")}</p>
          </>
        ) : (
          <UnsubscribeForm token={token} />
        )}
        <Button asChild variant="gold" size="lg" className="mt-7">
          <Link href="/">{t("backToApp")}</Link>
        </Button>
      </div>
    </div>
  );
}
