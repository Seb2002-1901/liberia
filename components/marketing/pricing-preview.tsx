import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, ROUTES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export function PricingPreview() {
  return (
    <section id="pricing" className="border-t border-border/60">
      <div className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
            Tarifs simples
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Commence gratuitement. Passe Premium quand tu veux.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Aucun engagement. Annulable en un clic.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          <PlanCard plan="free" />
          <PlanCard plan="premium" highlight />
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.pricing}>Voir toutes les fonctionnalités →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  highlight,
}: {
  plan: "free" | "premium";
  highlight?: boolean;
}) {
  const data = PLANS[plan];
  const price = data.priceMonthly;
  const badge = "badge" in data ? data.badge : undefined;

  return (
    <div
      className={`relative rounded-2xl border p-7 backdrop-blur-sm ${
        highlight
          ? "border-[hsl(var(--gold)/0.4)] bg-gradient-to-br from-[hsl(var(--gold)/0.06)] via-card/40 to-card/40 shadow-[0_30px_80px_-40px_hsl(var(--gold)/0.35)]"
          : "border-border/60 bg-card/40"
      }`}
    >
      {badge && (
        <Badge variant="gold" className="absolute -top-3 right-6">
          <Sparkles className="mr-1 h-3 w-3" />
          {badge}
        </Badge>
      )}
      <p className="text-sm font-medium text-muted-foreground">{data.name}</p>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-display text-4xl font-semibold">
          {price === 0 ? "0 €" : formatCurrency(price)}
        </span>
        <span className="text-sm text-muted-foreground">/ mois</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{data.description}</p>

      <Button
        asChild
        variant={highlight ? "gold" : "outline"}
        className="mt-6 w-full"
        size="lg"
      >
        <Link href={highlight ? ROUTES.subscription : ROUTES.register}>
          {highlight ? "Choisir Premium" : "Commencer gratuitement"}
        </Link>
      </Button>

      <ul className="mt-7 space-y-3">
        {data.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                highlight
                  ? "bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]"
                  : "bg-secondary text-foreground"
              }`}
            >
              <Check className="h-3 w-3" />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
