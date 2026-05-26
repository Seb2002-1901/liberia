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
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export function ProblemSection() {
  const items = [
    {
      icon: HeartPulse,
      title: "Tu te sens dépassé·e par tes finances",
      text: "Comptes éparpillés, dépenses floues, fin de mois tendue — c'est épuisant mentalement.",
    },
    {
      icon: LineChart,
      title: "Tu as l'impression de courir après l'argent",
      text: "Tu travailles dur mais tu n'arrives pas à savoir où il part vraiment.",
    },
    {
      icon: Compass,
      title: "Tu n'as pas de direction claire",
      text: "Tu veux avancer, mais sans plan tangible chaque mois ressemble au précédent.",
    },
  ];
  return (
    <Section eyebrow="Le constat" title="L'argent ne devrait pas être une source de stress permanent.">
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
  return (
    <Section
      eyebrow="La solution"
      title="Une boussole financière, calme, lisible, faite pour les humains."
      description="LIBERIA assemble ton argent, tes dépenses et tes objectifs dans une seule interface premium. Tu vois où tu en es, ce qui pèse, et la prochaine étape concrète."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <BigFeature
          icon={BarChart3}
          title="Score de stabilité financière"
          text="Une note sur 100 transparente qui résume ton équilibre : revenus, dépenses, épargne, fonds d'urgence."
        />
        <BigFeature
          icon={Target}
          title="Objectifs qui ont du sens"
          text="Fonds d'urgence, remboursement de dette, premier projet. Suivis simplement, sans gamification toxique."
        />
        <BigFeature
          icon={Wallet}
          title="Budget mensuel clair"
          text="Tes revenus et dépenses classés automatiquement par catégorie, sans connexion bancaire intrusive."
        />
        <BigFeature
          icon={PiggyBank}
          title="Reste à vivre réel"
          text="Tu sais immédiatement ce qu'il te reste après l'essentiel — et combien tu peux mettre de côté."
        />
      </div>
    </Section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Tu dresses le tableau",
      text: "5 minutes pour décrire ta situation, tes revenus et tes dépenses principales.",
    },
    {
      n: "02",
      title: "On calcule ta stabilité",
      text: "Score, reste à vivre, niveau de stress, fonds d'urgence — tout devient lisible.",
    },
    {
      n: "03",
      title: "Tu avances par paliers",
      text: "Des objectifs concrets, mois après mois, sans pression. Tu reprends ton souffle.",
    },
  ];

  return (
    <Section
      id="how-it-works"
      eyebrow="Comment ça marche"
      title="Trois étapes calmes pour reprendre la main."
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
  const items = [
    {
      icon: BarChart3,
      title: "Dashboard premium",
      text: "Une vue d'ensemble lisible, en quelques secondes.",
    },
    {
      icon: Wallet,
      title: "Suivi budget complet",
      text: "Revenus, dépenses, catégories essentielles ou plaisir.",
    },
    {
      icon: Target,
      title: "Objectifs financiers",
      text: "Crée et suis tes priorités en quelques tap.",
    },
    {
      icon: PiggyBank,
      title: "Épargne pilotée",
      text: "Le reste à vivre devient une vraie variable de décision.",
    },
    {
      icon: Layers,
      title: "Mode démo riche",
      text: "Teste tout, sans créer de compte, avec des données réalistes.",
    },
    {
      icon: Sparkles,
      title: "Coach IA inclus",
      text: "Un assistant qui comprend tes chiffres et te répond sans jargon.",
    },
  ];
  return (
    <Section
      id="features"
      eyebrow="Fonctionnalités"
      title="Tout ce qu'il faut. Rien qu'il ne faut."
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
  return (
    <Section
      id="security"
      eyebrow="Sécurité"
      title="Tes données t'appartiennent. Point."
      description="Stockage chiffré, accès strict par utilisateur via Row-Level Security Supabase, aucune revente, aucune publicité. LIBERIA n'a pas besoin de tes mots de passe bancaires."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Lock, t: "Chiffrement", d: "Connexion TLS et stockage chiffré au repos." },
          { icon: ShieldCheck, t: "RLS Supabase", d: "Chaque utilisateur ne voit que ses propres données." },
          { icon: Sparkles, t: "Pas d'agrégation bancaire", d: "Tu restes maître de ce que tu saisis, sans intermédiaire intrusif." },
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
  const faqs = [
    {
      q: "C'est vraiment gratuit ?",
      a: "Tu démarres avec 14 jours d'essai gratuit (carte requise pour activer). Après l'essai, ton abonnement choisi se déclenche automatiquement : 14.99 CHF/mois ou 119.99 CHF/an. Tu peux annuler à tout moment depuis ton espace, sans question.",
    },
    {
      q: "Que se passe-t-il si j'annule pendant l'essai ?",
      a: "Aucun prélèvement. Ton accès continue jusqu'à la fin des 14 jours, puis ton compte passe en pause — tes données restent en sécurité et tu peux réactiver quand tu veux.",
    },
    {
      q: "Quels moyens de paiement sont acceptés ?",
      a: "Cartes Visa, Mastercard et American Express, Apple Pay, Google Pay, ainsi que TWINT (Suisse, selon activation Stripe Dashboard). Tout est géré par Stripe — chiffré et conforme PCI.",
    },
    {
      q: "Mes données sont-elles connectées à ma banque ?",
      a: "Non. LIBERIA fonctionne par saisie volontaire pour rester 100 % sous ton contrôle. C'est plus sain mentalement et nettement plus sûr.",
    },
    {
      q: "Pour qui est LIBERIA ?",
      a: "Pour toute personne qui veut reprendre pied financièrement — du salarié serré au freelance qui veut clarifier son année, en passant par les profils en reconstruction.",
    },
    {
      q: "Et l'IA dans tout ça ?",
      a: "Le coach IA est déjà inclus : tu peux discuter de ta situation, demander un plan financier sur 30, 60 ou 90 jours, et obtenir des recommandations adaptées à tes vrais chiffres. Aucune donnée bancaire requise — tu lui parles comme à quelqu'un qui connaît ton dossier.",
    },
  ];
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions fréquentes.">
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
  return (
    <section className="relative overflow-hidden border-t border-border/60 bg-background">
      <div
        className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-[hsl(var(--gold)/0.06)] to-transparent"
        aria-hidden
      />
      <div className="container relative py-20 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Donne à ton argent une direction <span className="gold-text">claire</span>.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          Crée ton compte en 30 secondes — ou explore le mode démo sans inscription.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="xl" variant="gold">
            <Link href={ROUTES.register}>
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href={ROUTES.demo}>Essayer la démo</Link>
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
