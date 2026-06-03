import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LegalPage() {
  const t = await getTranslations("marketing.legal");
  return (
    <article className="container max-w-3xl py-16">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>

      <div className="mt-8 flex gap-4 rounded-2xl border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.06)] p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--warning))]" />
        <div className="space-y-2 text-sm text-foreground/90">
          <p className="font-medium">{t("headline")}</p>
          <p
            className="text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: t.raw("body1") as string }}
          />
          <p className="text-muted-foreground">{t("body2")}</p>
        </div>
      </div>
    </article>
  );
}
