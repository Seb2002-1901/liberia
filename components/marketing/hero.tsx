"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
      <div
        className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[hsl(var(--gold)/0.10)] blur-3xl"
        aria-hidden
      />

      <div className="container relative pt-20 pb-24 sm:pt-28 sm:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.06)] px-3 py-1 text-xs font-medium text-[hsl(var(--gold))]">
            <Sparkles className="h-3.5 w-3.5" />
            Nouvelle génération de pilotage financier
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            Reprends le contrôle de
            <span className="gold-text"> ton argent.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            LIBERIA t'aide à comprendre ta situation financière, réduire ton stress
            et construire une stabilité durable — sans jargon, sans culpabilisation.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="xl" variant="gold">
              <Link href={ROUTES.register}>
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/#how-it-works">Voir comment ça marche</Link>
            </Button>
          </div>
          <p className="mt-5 inline-flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            14 jours gratuits · Données chiffrées · Sans pub
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/40 p-2 shadow-[0_30px_120px_-30px_hsl(var(--gold)/0.25)] backdrop-blur-md">
      <div className="rounded-2xl border border-border/40 bg-background/80 p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Stabilité financière
            </p>
            <p className="mt-1 font-display text-3xl font-semibold">
              <span className="gold-text">68</span>
              <span className="ml-1 text-base font-normal text-muted-foreground">
                /100
              </span>
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Pill label="Reste à vivre · 540 CHF" />
            <Pill label="Épargne · +210 CHF" highlight />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MiniCard label="Revenus" value="2 450 CHF" trend="+0%" />
          <MiniCard label="Dépenses" value="1 910 CHF" trend="-4%" tone="success" />
          <MiniCard label="Objectifs" value="2 actifs" trend="48%" tone="gold" />
        </div>
        <div className="mt-6 h-32 rounded-xl border border-border/40 bg-gradient-to-br from-[hsl(var(--gold)/0.08)] via-transparent to-transparent" />
      </div>
    </div>
  );
}

function Pill({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs ${
        highlight
          ? "border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.08)] text-[hsl(var(--gold))]"
          : "border-border/60 text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

function MiniCard({
  label,
  value,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: string;
  trend: string;
  tone?: "neutral" | "success" | "gold";
}) {
  const trendColor = {
    neutral: "text-muted-foreground",
    success: "text-[hsl(var(--success))]",
    gold: "text-[hsl(var(--gold))]",
  }[tone];
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
      <p className={`mt-1 text-xs ${trendColor}`}>{trend}</p>
    </div>
  );
}
