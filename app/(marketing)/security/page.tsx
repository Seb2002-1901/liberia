import type { Metadata } from "next";
import Link from "next/link";
import {
  Database,
  HeartHandshake,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sécurité & confiance",
  description:
    "Comment LIBERIA protège tes données financières — chiffrement, isolation par utilisateur, contrôle total côté utilisateur.",
};

export default function SecurityPage() {
  return (
    <article className="container max-w-3xl py-16">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        Sécurité & confiance
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Tes finances méritent un cadre sain.
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        On ne te promet pas une « sécurité de niveau bancaire » — on te
        dit comment c&apos;est construit, et tu juges. La règle qui guide tout :
        moins on touche à tes données, mieux c&apos;est.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <Pillar
          icon={<Lock className="h-4 w-4" />}
          title="Chiffrement en transit et au repos"
          body="HTTPS obligatoire (TLS) entre ton navigateur et nos serveurs. Stockage chiffré au repos via Supabase Postgres (AES-256 géré par l'infra Supabase, hébergement UE)."
        />
        <Pillar
          icon={<UserCheck className="h-4 w-4" />}
          title="Isolation par utilisateur"
          body="Chaque ligne de tes tables (revenus, dépenses, objectifs, plans, conversations) est filtrée par PostgreSQL Row-Level Security. Tu ne peux lire que tes propres données — la base elle-même refuse les requêtes inter-comptes."
        />
        <Pillar
          icon={<KeyRound className="h-4 w-4" />}
          title="Pas de service-role côté navigateur"
          body="La clé qui contournerait les règles RLS reste uniquement côté serveur. Aucun secret Stripe, Anthropic ou base de données n'est expédié dans le bundle navigateur."
        />
        <Pillar
          icon={<Database className="h-4 w-4" />}
          title="Paiements gérés par Stripe"
          body="On ne stocke jamais ton numéro de carte. Stripe (conforme PCI niveau 1) capture et garde l'information côté Stripe. On garde uniquement un identifiant abonnement pour synchroniser ton statut."
        />
        <Pillar
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Webhook signé, idempotent"
          body="Les events Stripe sont vérifiés cryptographiquement avant d'être appliqués. Une livraison rejouée par erreur ne provoque pas de double-traitement (déduplication au niveau base)."
        />
        <Pillar
          icon={<HeartHandshake className="h-4 w-4" />}
          title="Tu gardes le contrôle"
          body="Export RGPD de tes données en un clic. Suppression définitive de ton compte en deux clics. Aucune donnée n'est revendue — c'est notre engagement."
        />
      </div>

      <section className="mt-12 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Ce qu&apos;on ne fait pas (volontairement)
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Pas d&apos;agrégation bancaire.</strong>{" "}
            LIBERIA fonctionne uniquement avec la saisie volontaire. Tu ne connectes
            jamais ta banque — moins de surface d&apos;attaque, plus de clarté mentale.
          </li>
          <li>
            <strong className="text-foreground">Pas de revente de données.</strong>{" "}
            Aucune donnée ne quitte ton compte pour des fins publicitaires ou
            commerciales. Aucun partenariat data.
          </li>
          <li>
            <strong className="text-foreground">Pas de tracking publicitaire.</strong>{" "}
            Pas de pixel Facebook / Google Ads. Pas de fingerprinting. Tu peux
            désactiver les compteurs internes anonymes depuis tes paramètres.
          </li>
        </ul>
      </section>

      <section className="mt-12 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Limites honnêtes
        </h2>
        <p className="text-sm text-muted-foreground">
          LIBERIA n&apos;a pas d&apos;audit SOC 2 ni ISO 27001. On n&apos;est pas
          certifié bancaire. C&apos;est une jeune application qui s&apos;appuie sur
          des fournisseurs robustes (Supabase, Stripe, Vercel) et qui suit les
          bonnes pratiques OWASP de base. Si ton usage requiert une certification
          spécifique, contacte-nous — on documentera ce qu&apos;on peut.
        </p>
      </section>

      <section className="mt-12 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Signaler une vulnérabilité
        </h2>
        <p className="text-sm text-muted-foreground">
          Si tu identifies un problème de sécurité, écris-nous à{" "}
          <strong>security@liberia.app</strong>. On répond sous 72 heures
          ouvrées. On préfère que tu nous écrives en premier avant toute
          publication — on reconnaît ton aide publiquement après le fix
          (responsible disclosure).
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild variant="gold">
          <Link href={ROUTES.privacy}>Politique de confidentialité</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.aiPolicy}>Politique IA responsable</Link>
        </Button>
      </div>
    </article>
  );
}

function Pillar({
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
