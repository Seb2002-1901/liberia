import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutFeedback } from "@/components/billing/checkout-feedback";
import { PortalButton } from "@/components/billing/portal-button";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { TRIAL_DAYS } from "@/lib/stripe/config";
import { formatDate } from "@/lib/utils";
import { getFinanceData } from "@/lib/services/finance";

export const metadata: Metadata = {
  title: "Abonnement",
};

type BillingState =
  | { kind: "none" }
  | {
      kind: "trial";
      trialEndsAt: string;
      daysLeft: number;
      cancelAtPeriodEnd: boolean;
    }
  | {
      kind: "active";
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
    }
  | {
      kind: "past_due";
      currentPeriodEnd: string | null;
    }
  | {
      kind: "lapsed";
      status: string | null;
    };

function inferBillingState(
  sub: Awaited<ReturnType<typeof getFinanceData>>["subscription"],
): BillingState {
  if (!sub.status) return { kind: "none" };
  if (sub.status === "trialing" && sub.trial_ends_at) {
    const ends = new Date(sub.trial_ends_at).getTime();
    const daysLeft = Math.max(
      0,
      Math.ceil((ends - Date.now()) / (1000 * 60 * 60 * 24)),
    );
    return {
      kind: "trial",
      trialEndsAt: sub.trial_ends_at,
      daysLeft,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }
  if (sub.status === "active")
    return {
      kind: "active",
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  if (sub.status === "past_due" || sub.status === "unpaid")
    return { kind: "past_due", currentPeriodEnd: sub.current_period_end };
  return { kind: "lapsed", status: sub.status };
}

export default async function SubscriptionPage() {
  const data = await getFinanceData();
  const sub = data.subscription;
  const billing = inferBillingState(sub);

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
                  Essai gratuit en cours — {billing.daysLeft}{" "}
                  {billing.daysLeft > 1 ? "jours" : "jour"} restants
                </p>
                <p className="text-sm text-muted-foreground">
                  Le prélèvement automatique commence le{" "}
                  {formatDate(billing.trialEndsAt)}.{" "}
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
                  : "secondary"
            }
          >
            {sub.status === "trialing"
              ? "Essai"
              : sub.status === "active"
                ? "Premium"
                : sub.status === "past_due" || sub.status === "unpaid"
                  ? "Paiement en attente"
                  : sub.status === "canceled"
                    ? "Annulé"
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

      <PricingPlans
        variant="in-app"
        isAuthenticated
        currentPriceId={sub.price_id}
      />

      <p className="text-xs text-muted-foreground">
        Paiement géré par Stripe (chiffré, conforme PCI). Moyens acceptés :
        cartes Visa / Mastercard / American Express, Apple Pay, Google Pay et
        TWINT (Suisse, selon activation Stripe Dashboard).
      </p>
    </div>
  );
}
