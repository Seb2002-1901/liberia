import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";

export default async function NotFound() {
  const t = await getTranslations("common.errorPages.notFound");
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container py-6">
        <BrandMark />
      </div>
      <div className="container my-auto flex flex-col items-center text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">{t("body")}</p>
        <Button asChild variant="gold" size="lg" className="mt-7">
          <Link href="/">{t("cta")}</Link>
        </Button>
      </div>
    </div>
  );
}
