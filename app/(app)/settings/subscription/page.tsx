import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutFeedback } from "@/components/billing/checkout-feedback";
import { PortalButton } from "@/components/billing/portal-button";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { TRIAL_DAYS } from "@/lib/stripe/config";
import { formatDate } from "@/lib/utils";
import { getFinanceData } from "@/lib/services/finance";
import { inferBillingState } from "@/lib/billing/state";

export const metadata: Metadata = {
  title: "Abonnement",
};

export default async function SubscriptionPage() {
  const data = await getFinanceData();
  const sub = data.subscription;
  const billing = inferBillingState(sub);
  const timeline = buildAccountTimeline(sub);

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <CheckoutFeedback />
      </Suspense>
      <PageHeader
        eyebrow="Compte"
        title="Abonnement"
        description="Gère ton essai, ton plan et ton moyen de paiement."
      />

      {/* Billing state banner */}
      {billing.kind === "trial" && (
        <Card>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 py-5">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-[hsl(var(--gold))]" />
              <div>
                <p className="font-medium">
                  {billing.daysLeft === null
                    ? "Essai gratuit en cours"
                    : `Essai gratuit en cours — ${billing.daysLeft} ${billing.daysLeft > 1 ? "jours" : "jour"} restants`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {billing.trialEndsAt
                    ? `Le prélèvement automatique commence le ${formatDate(billing.trialEndsAt)}. `
                    : "Le prélèvement automatique se déclenchera en fin d'essai. "}
                  {billing.cancelAtPeriodEnd
                    ? "Tu as annulé : aucune facture ne sera prélevée."
                    : "Tu peux annuler à tout moment via le portail."}
                </p>
              </div>
            </div>
            {sub.has_customer && <PortalButton />}
          </CardContent>
        </Card>
      )}

      {billing.kind === "active" && (
        <Card>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 py-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-[hsl(var(--success))]" />
              <div>
                <p className="font-medium">
                  Abonnement actif
                  {billing.cancelAtPeriodEnd && " — annulation programmée"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {billing.cancelAtPeriodEnd
                    ? `Ton accès continue jusqu'au ${billing.currentPeriodEnd ? formatDate(billing.currentPeriodEnd) : "terme de la période"}.`
                    : billing.currentPeriodEnd
                      ? `Prochain renouvellement : ${formatDate(billing.currentPeriodEnd)}.`
                      : "Tu peux gérer ton abonnement à tout moment."}
                </p>
              </div>
            </div>
            {sub.has_customer && <PortalButton />}
          </CardContent>
        </Card>
      )}

      {billing.kind === "past_due" && (
        <Card className="border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.05)]">
          <CardContent className="flex flex-wrap items-start justify-between gap-3 py-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-[hsl(var(--warning))]" />
              <div>
                <p className="font-medium text-[hsl(var(--warning))]">
                  Paiement en attente
                </p>
                <p className="text-sm text-muted-foreground">
                  Le dernier prélèvement n'a pas abouti. Mets à jour ton moyen
                  de paiement via le portail pour réactiver ton accès — tes
                  données restent en sécurité.
                </p>
              </div>
            </div>
            {sub.has_customer && <PortalButton />}
          </CardContent>
        </Card>
      )}

      {billing.kind === "lapsed" && (
        <Card>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 py-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-[hsl(var(--gold))]" />
              <div>
                <p className="font-medium">
                  {sub.trial_used
                    ? "Ton accès est en pause"
                    : "Tu peux activer ton accès"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {sub.trial_used
                    ? "Choisis un plan pour réactiver ton accès complet à LIBERIA. Tes données restent intactes."
                    : `Active ton essai gratuit de ${TRIAL_DAYS} jours. Annulable à tout moment.`}
                </p>
              </div>
            </div>
            {sub.has_customer && <PortalButton />}
          </CardContent>
        </Card>
      )}

      {/* Status chip */}
      <Card>
        <CardHeader>
          <CardTitle>Plan actuel</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge
            variant={
              sub.status === "trialing"
                ? "gold"
                : sub.status === "active"
                  ? "success"
                  : sub.status === "past_due" || sub.status === "unpaid"
                    ? "warning"
                    : "secondary"
            }
          >
            {sub.status === "trialing"
              ? "Essai"
              : sub.status === "active"
                ? "Premium"
                : sub.status === "past_due" || sub.status === "unpaid"
                  ? "Paiement en attente"
                  : sub.status === "paused"
                    ? "Essai en pause"
                    : sub.status === "canceled"
                      ? "Annulé"
                      : sub.status === "incomplete" ||
                          sub.status === "incomplete_expired"
                        ? "Paiement incomplet"
                        : "Aucun abonnement"}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {sub.trial_used && billing.kind === "lapsed"
              ? "Tu as déjà utilisé ton essai gratuit. Les prochains plans démarrent au tarif normal."
              : !sub.status
                ? `Démarre par ${TRIAL_DAYS} jours gratuits. Carte requise pour activer.`
                : "Tu peux changer de plan ou annuler à tout moment via le portail."}
          </p>
        </CardContent>
      </Card>

      {timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-[hsl(var(--gold))]" />
              Activité du compte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {timeline.map((event, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--gold))]"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      {event.label}
                    </p>
                    {event.detail && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {event.detail}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <PricingPlans
        variant="in-app"
        isAuthenticated
        currentPriceId={sub.price_id}
      />

      <p className="text-xs text-muted-foreground">
        Facturation en CHF pour le lancement, quel que soit ton pays. Paiement
        géré par Stripe (chiffré, conforme PCI). Moyens acceptés : cartes Visa /
        Mastercard / American Express, Apple Pay, Google Pay et TWINT (Suisse,
        selon activation Stripe Dashboard).
      </p>
    </div>
  );
}

/**
 * Builds a short, human-readable list of key dates for the user's
 * subscription. Returns [] when nothing meaningful exists (e.g. brand-
 * new account before checkout) so the card is hidden rather than
 * empty.
 */
function buildAccountTimeline(
  sub: Awaited<ReturnType<typeof getFinanceData>>["subscription"],
): Array<{ label: string; detail?: string }> {
  const events: Array<{ label: string; detail?: string }> = [];

  if (sub.trial_used) {
    events.push({
      label: "Essai gratuit utilisé",
      detail: "Un seul essai par compte — anti-abus.",
    });
  }

  if (sub.trial_ends_at) {
    const label =
      sub.status === "trialing"
        ? `Fin de l'essai : ${formatDate(sub.trial_ends_at)}`
        : `Essai terminé le ${formatDate(sub.trial_ends_at)}`;
    events.push({ label });
  }

  if (sub.current_period_end && sub.status === "active") {
    events.push({
      label: sub.cancel_at_period_end
        ? `Accès maintenu jusqu'au ${formatDate(sub.current_period_end)}`
        : `Prochain renouvellement : ${formatDate(sub.current_period_end)}`,
    });
  }

  if (sub.cancel_at_period_end && sub.status !== "active") {
    events.push({
      label: "Annulation programmée",
      detail: "Tu peux la révoquer via le portail tant que la période n'est pas écoulée.",
    });
  }

  if (sub.has_customer) {
    events.push({
      label: "Moyen de paiement enregistré chez Stripe",
      detail: "Gérable depuis le portail client.",
    });
  }

  return events;
}
