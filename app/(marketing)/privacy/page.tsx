import type { Metadata } from "next";
import { Fragment } from "react";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.privacy.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

type Section = { heading: string; html: string };

export default async function PrivacyPage() {
  const t = await getTranslations("marketing.privacy");
  const locale = await getLocale();
  const sections = t.raw("sections") as Section[];
  const date = new Date().toLocaleDateString(locale);

  return (
    <article className="container max-w-3xl py-16 prose prose-invert prose-headings:font-display prose-headings:tracking-tight">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        {t("eyebrow")}
      </p>
      <h1>{t("title")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("lastUpdatedLabel", { date })}
      </p>
      {sections.map((s, i) => (
        <Fragment key={i}>
          <h2>{s.heading}</h2>
          <div dangerouslySetInnerHTML={{ __html: s.html }} />
        </Fragment>
      ))}
    </article>
  );
}
