import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, Sparkles, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isAdminUser } from "@/lib/admin";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getReadinessSummary } from "@/lib/readiness";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin · LIBERIA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Minimal admin analytics surface. Gated by ADMIN_USER_IDS env (404
 * to non-admins so the route's existence stays private). Counts pulled
 * straight from Postgres via the service-role client — no external
 * analytics provider required.
 */
export default async function AdminPage() {
  if (!isSupabaseConfigured() || !isAdminConfigured()) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminUser(user?.id)) notFound();

  const stats = await loadStats();
  const readiness = getReadinessSummary();

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="space-y-2">
        <Badge variant="gold" className="gap-1">
          <Sparkles className="h-3 w-3" /> Admin
        </Badge>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Aperçu produit
        </h1>
        <p className="text-sm text-muted-foreground">
          Compteurs internes — uniquement les agrégats, jamais de données
          individuelles. Aucune donnée n&apos;est exposée à un tiers.
        </p>
      </div>

      <Card
        className={cn(
          "border-border/60",
          readiness.productionReady
            ? "border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.04)]"
            : "border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.04)]",
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[hsl(var(--gold))]" />
              Préparation production
            </span>
            <Badge
              variant={readiness.productionReady ? "success" : "warning"}
            >
              {readiness.productionReady
                ? "Prêt"
                : `${readiness.counts.missingRequired} requis manquant${readiness.counts.missingRequired > 1 ? "s" : ""}`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {readiness.checks.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm"
              >
                <span className="mt-0.5 shrink-0">
                  {c.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                  ) : c.status === "required" ? (
                    <XCircle className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {c.status}
                    </span>
                  </div>
                  {!c.ok && c.hint && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.hint}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Aucune valeur d&apos;env n&apos;est jamais affichée — uniquement la
            présence (oui/non) de chaque variable.
          </p>
        </CardContent>
      </Card>

      <Section title="Acquisition">
        <Stat label="Comptes créés" value={stats.totalUsers} />
        <Stat
          label="Onboarding complété"
          value={stats.onboardedUsers}
          hint={pctHint(stats.onboardedUsers, stats.totalUsers)}
        />
      </Section>

      <Section title="Abonnement">
        <Stat label="En essai" value={stats.trialingSubs} tone="gold" />
        <Stat label="Premium actif" value={stats.activeSubs} tone="success" />
        <Stat label="En attente / pause" value={stats.warningSubs} tone="warning" />
        <Stat label="Annulés" value={stats.canceledSubs} />
      </Section>

      <Section title="Engagement coach">
        <Stat label="Conversations IA" value={stats.aiConversations} />
        <Stat
          label="Messages 7 derniers jours"
          value={stats.aiMessagesLast7d}
          hint="user + assistant confondus"
        />
        <Stat label="Plans générés" value={stats.financialPlans} />
        <Stat
          label="Étapes plan validées"
          value={stats.planStepsCompleted}
        />
      </Section>

      <Section title="Objectifs">
        <Stat label="Objectifs créés" value={stats.totalGoals} />
        <Stat label="Objectifs atteints" value={stats.completedGoals} />
      </Section>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            <ArrowRight className="mr-1 inline h-3 w-3 text-[hsl(var(--gold))]" />
            Les compteurs reflètent l&apos;état présent (pas d&apos;historique
            time-series). Pour des séries dans le temps, brancher un
            provider analytics dédié (voir <code>lib/analytics/</code>).
          </p>
          <p>
            <ArrowRight className="mr-1 inline h-3 w-3 text-[hsl(var(--gold))]" />
            Aucun e-mail, nom complet, montant ou contenu utilisateur
            n&apos;apparaît sur cette page. Si tu en vois — c&apos;est un bug,
            signale-le.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "neutral" | "gold" | "success" | "warning";
}) {
  const valueColor =
    tone === "gold"
      ? "text-[hsl(var(--gold))]"
      : tone === "success"
        ? "text-[hsl(var(--success))]"
        : tone === "warning"
          ? "text-[hsl(var(--warning))]"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${valueColor}`}>
        {value.toLocaleString("fr-CH")}
      </p>
      {hint && (
        <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function pctHint(n: number, d: number): string | undefined {
  if (d === 0) return undefined;
  return `${Math.round((n / d) * 100)} % du total`;
}

type Stats = {
  totalUsers: number;
  onboardedUsers: number;
  trialingSubs: number;
  activeSubs: number;
  warningSubs: number;
  canceledSubs: number;
  aiConversations: number;
  aiMessagesLast7d: number;
  financialPlans: number;
  planStepsCompleted: number;
  totalGoals: number;
  completedGoals: number;
};

async function loadStats(): Promise<Stats> {
  const admin = getAdminClient();
  const SEVEN_DAYS_AGO = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // head:true + count:'exact' returns just the count without row data —
  // the cheapest way to aggregate per-table. Each query is a single
  // round-trip; running them in Promise.all keeps the page snappy.
  const toCount = (r: { count: number | null }): number => r.count ?? 0;

  const [
    totalUsers,
    onboardedUsers,
    trialingSubs,
    activeSubs,
    pastDueSubs,
    unpaidSubs,
    pausedSubs,
    canceledSubs,
    aiConversations,
    aiMessagesLast7d,
    financialPlans,
    planStepsCompleted,
    totalGoals,
    completedGoals,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).then(toCount),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("onboarding_completed", true)
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "trialing")
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "past_due")
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "unpaid")
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "paused")
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "canceled")
      .then(toCount),
    admin.from("ai_conversations").select("id", { count: "exact", head: true }).then(toCount),
    admin
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", SEVEN_DAYS_AGO)
      .then(toCount),
    admin.from("financial_plans").select("id", { count: "exact", head: true }).then(toCount),
    admin
      .from("financial_plan_steps")
      .select("id", { count: "exact", head: true })
      .eq("is_completed", true)
      .then(toCount),
    admin.from("goals").select("id", { count: "exact", head: true }).then(toCount),
    admin
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("is_completed", true)
      .then(toCount),
  ]);

  return {
    totalUsers,
    onboardedUsers,
    trialingSubs,
    activeSubs,
    warningSubs: pastDueSubs + unpaidSubs + pausedSubs,
    canceledSubs,
    aiConversations,
    aiMessagesLast7d,
    financialPlans,
    planStepsCompleted,
    totalGoals,
    completedGoals,
  };
}
