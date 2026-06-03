import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import {
  Database,
  HeartHandshake,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.security.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

const PILLAR_ICONS = [
  Lock,
  UserCheck,
  KeyRound,
  Database,
  ShieldCheck,
  HeartHandshake,
] as const;

type Pillar = { title: string; body: string };
type Section = { heading: string; html: string };

export default async function SecurityPage() {
  const t = await getTranslations("marketing.security");
  const pillars = t.raw("pillars") as Pillar[];
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

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {pillars.map((p, i) => {
          const Icon = PILLAR_ICONS[i] ?? Lock;
          return (
            <PillarCard
              key={i}
              icon={<Icon className="h-4 w-4" />}
              title={p.title}
              body={p.body}
            />
          );
        })}
      </div>

      {sections.map((s, i) => (
        <Fragment key={i}>
          <section className="mt-12 space-y-3">
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
          <Link href={ROUTES.privacy}>{t("ctaPrivacy")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.aiPolicy}>{t("ctaAiPolicy")}</Link>
        </Button>
      </div>
    </article>
  );
}

function PillarCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <span
        aria-hidden
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]"
      >
        {icon}
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
