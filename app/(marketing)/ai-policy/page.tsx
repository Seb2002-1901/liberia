import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.aiPolicy.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

type Section = { heading: string; html: string };

export default async function AiPolicyPage() {
  const t = await getTranslations("marketing.aiPolicy");
  const sections = t.raw("sections") as Section[];

  return (
    <article className="container max-w-3xl py-16">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{t("intro")}</p>

      {sections.map((s, i) => (
        <Fragment key={i}>
          <section className="mt-10 space-y-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {s.heading}
            </h2>
            <div
              className="space-y-2 text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: s.html }}
            />
          </section>
        </Fragment>
      ))}

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild variant="gold">
          <Link href={ROUTES.security}>
            <Sparkles className="h-4 w-4" />
            {t("ctaSecurity")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.privacy}>{t("ctaPrivacy")}</Link>
        </Button>
      </div>
    </article>
  );
}
