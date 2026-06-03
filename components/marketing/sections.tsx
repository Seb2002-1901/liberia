"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Compass,
  HeartPulse,
  Layers,
  LineChart,
  Lock,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export function ProblemSection() {
  const t = useTranslations("marketing.problem");
  const items = [
    { icon: HeartPulse, title: t("items.overwhelmed.title"), text: t("items.overwhelmed.text") },
    { icon: LineChart, title: t("items.chasing.title"), text: t("items.chasing.text") },
    { icon: Compass, title: t("items.direction.title"), text: t("items.direction.text") },
  ];
  return (
    <Section eyebrow={t("eyebrow")} title={t("title")}>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <FeatureCard
            key={item.title}
            icon={<item.icon className="h-5 w-5" />}
            title={item.title}
            description={item.text}
            tone="muted"
          />
        ))}
      </div>
    </Section>
  );
}

export function SolutionSection() {
  const t = useTranslations("marketing.solution");
  return (
    <Section
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <BigFeature icon={BarChart3} title={t("items.score.title")} text={t("items.score.text")} />
        <BigFeature icon={Target} title={t("items.goals.title")} text={t("items.goals.text")} />
        <BigFeature icon={Wallet} title={t("items.budget.title")} text={t("items.budget.text")} />
        <BigFeature icon={PiggyBank} title={t("items.leftover.title")} text={t("items.leftover.text")} />
      </div>
    </Section>
  );
}

export function HowItWorks() {
  const t = useTranslations("marketing.howItWorks");
  const steps = [
    { n: "01", title: t("steps.one.title"), text: t("steps.one.text") },
    { n: "02", title: t("steps.two.title"), text: t("steps.two.text") },
    { n: "03", title: t("steps.three.title"), text: t("steps.three.text") },
  ];

  return (
    <Section
      id="how-it-works"
      eyebrow={t("eyebrow")}
      title={t("title")}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm"
          >
            <p className="font-display text-3xl font-semibold text-[hsl(var(--gold))]">
              {s.n}
            </p>
            <h3 className="mt-2 font-display text-lg font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

export function FeaturesSection() {
  const t = useTranslations("marketing.features");
  const items = [
    { icon: BarChart3, title: t("items.dashboard.title"), text: t("items.dashboard.text") },
    { icon: Wallet, title: t("items.budget.title"), text: t("items.budget.text") },
    { icon: Target, title: t("items.goals.title"), text: t("items.goals.text") },
    { icon: PiggyBank, title: t("items.savings.title"), text: t("items.savings.text") },
    { icon: Layers, title: t("items.demo.title"), text: t("items.demo.text") },
    { icon: Sparkles, title: t("items.coach.title"), text: t("items.coach.text") },
  ];
  return (
    <Section
      id="features"
      eyebrow={t("eyebrow")}
      title={t("title")}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <FeatureCard
            key={item.title}
            icon={<item.icon className="h-5 w-5" />}
            title={item.title}
            description={item.text}
          />
        ))}
      </div>
    </Section>
  );
}

export function SecuritySection() {
  const t = useTranslations("marketing.security");
  return (
    <Section
      id="security"
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Lock, t: t("items.encryption.title"), d: t("items.encryption.text") },
          { icon: ShieldCheck, t: t("items.rls.title"), d: t("items.rls.text") },
          { icon: Sparkles, t: t("items.noAggregation.title"), d: t("items.noAggregation.text") },
        ].map((item) => (
          <FeatureCard
            key={item.t}
            icon={<item.icon className="h-5 w-5" />}
            title={item.t}
            description={item.d}
          />
        ))}
      </div>
    </Section>
  );
}

export function FaqSection() {
  const t = useTranslations("marketing.faq");
  const faqs = [
    { q: t("items.free.q"), a: t("items.free.a") },
    { q: t("items.cancelTrial.q"), a: t("items.cancelTrial.a") },
    { q: t("items.payment.q"), a: t("items.payment.a") },
    { q: t("items.bank.q"), a: t("items.bank.a") },
    { q: t("items.audience.q"), a: t("items.audience.a") },
    { q: t("items.ai.q"), a: t("items.ai.a") },
  ];
  return (
    <Section id="faq" eyebrow={t("eyebrow")} title={t("title")}>
      <div className="mx-auto max-w-3xl divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/40">
        {faqs.map((f) => (
          <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium">
              {f.q}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export function CtaSection() {
  const t = useTranslations("marketing.cta");
  return (
    <section className="relative overflow-hidden border-t border-border/60 bg-background">
      <div
        className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-[hsl(var(--gold)/0.06)] to-transparent"
        aria-hidden
      />
      <div className="container relative py-20 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("titleBefore")} <span className="gold-text">{t("titleAccent")}</span>
          {t("titleAfter")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="xl" variant="gold">
            <Link href={ROUTES.register}>
              {t("ctaStart")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href={ROUTES.demo}>{t("ctaDemo")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ id, eyebrow, title, description, children }: SectionProps) {
  return (
    <section id={id} className="border-t border-border/60">
      <div className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h2>
          {description && (
            <p className="mt-3 text-pretty text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone?: "muted";
}) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm transition-colors hover:bg-card/60">
      <div
        className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          tone === "muted"
            ? "bg-secondary text-muted-foreground"
            : "bg-gradient-to-br from-[hsl(var(--gold)/0.25)] to-transparent text-[hsl(var(--gold))]"
        }`}
      >
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function BigFeature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--gold)/0.25)] to-transparent text-[hsl(var(--gold))]">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-display text-base font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
