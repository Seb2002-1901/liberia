import type { Metadata } from "next";
import { Suspense } from "react";
import { Check, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { CheckoutFeedback } from "@/components/billing/checkout-feedback";
import { PortalButton } from "@/components/billing/portal-button";
import { PLANS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { getFinanceData } from "@/lib/services/finance";

export const metadata: Metadata = {
  title: "Abonnement",
};

export default async function SubscriptionPage() {
  const data = await getFinanceData();
  const isPremium = data.subscription.plan === "premium";

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <CheckoutFeedback />
      </Suspense>
      <PageHeader
        eyebrow="Compte"
        title="Abonnement"
        description="Reste libre. Aucun engagement, annulation en un clic."
      />

      <Card>
        <CardHeader>
          <CardTitle>Plan actuel</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant={isPremium ? "gold" : "secondary"}>
            {isPremium ? (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Premium
              </span>
            ) : (
              "Gratuit"
            )}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {isPremium
              ? "Merci pour ton soutien — toutes les fonctions sont débloquées."
              : "Tu utilises LIBERIA gratuitement. Pour usage illimité, choisis Premium."}
          </p>
          {isPremium && (
            <div className="basis-full">
              <PortalButton />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard plan="free" current={!isPremium} />
        <PlanCard plan="premium" current={isPremium} highlight />
      </div>

      <p className="text-xs text-muted-foreground">
        Le paiement est géré via Stripe (chiffré, conforme PCI). Aucune carte n'est requise pour le plan Gratuit.
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  current,
  highlight,
}: {
  plan: "free" | "premium";
  current?: boolean;
  highlight?: boolean;
}) {
  const data = PLANS[plan];
  return (
    <div
      className={`relative rounded-2xl border p-6 ${
        highlight
          ? "border-[hsl(var(--gold)/0.4)] bg-gradient-to-br from-[hsl(var(--gold)/0.06)] to-card/40"
          : "border-border/60 bg-card/40"
      }`}
    >
      {current && (
        <Badge variant={highlight ? "gold" : "secondary"} className="absolute -top-3 right-6">
          Plan actuel
        </Badge>
      )}
      <p className="text-sm font-medium text-muted-foreground">{data.name}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-3xl font-semibold">
          {data.priceMonthly === 0 ? "0 €" : formatCurrency(data.priceMonthly)}
        </span>
        <span className="text-sm text-muted-foreground">/ mois</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{data.description}</p>

      <ul className="mt-5 space-y-2 text-sm">
        {data.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-[hsl(var(--gold))]" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {plan === "premium" ? (
          current ? (
            <Button disabled variant="outline" className="w-full">
              Plan actif
            </Button>
          ) : (
            <CheckoutButton planId="premium_monthly" />
          )
        ) : (
          <Button disabled variant="outline" className="w-full">
            {current ? "Plan actuel" : "Plan par défaut"}
          </Button>
        )}
      </div>
    </div>
  );
}
