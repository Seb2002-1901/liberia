import { NextResponse } from "next/server";
import { z } from "zod";
import { isStripeConfigured, STRIPE_PLANS, type StripePlanId } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  planId: z.enum(["premium_monthly", "premium_yearly"]),
});

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Paiement bientôt disponible. Configure les variables Stripe dans .env.local pour activer.",
      },
      { status: 501 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  const planId: StripePlanId = parsed.data.planId;
  const plan = STRIPE_PLANS[planId];
  if (!plan?.priceId) {
    return NextResponse.json(
      { error: "Tarif Stripe non configuré pour ce plan." },
      { status: 501 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Authentification requise — configure Supabase." },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const rate = await checkRateLimit("stripe", user.id);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaye dans quelques instants." },
      { status: 429 },
    );
  }

  // NEXT_PUBLIC_APP_URL is the only trusted origin for Stripe redirects.
  // Never fall back to the Origin header — an attacker controls it and could
  // redirect the user back to a malicious domain after payment.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Reuse the existing Stripe Customer if we've already provisioned one
  // for this user (previous checkout, even if since cancelled). Without
  // this, every new subscription creates a fresh Customer in Stripe and
  // the lookup-by-customer-id fallback in the webhook breaks across
  // resubscription cycles.
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Use the persisted customer when available, otherwise just hint the
      // email so Stripe can pre-fill the form. Don't set both at once —
      // Stripe rejects that combination.
      ...(existingSub?.stripe_customer_id
        ? { customer: existingSub.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings/subscription?status=success`,
      cancel_url: `${baseUrl}/settings/subscription?status=cancel`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: "premium" },
      // CRITICAL: session metadata is NOT propagated to the eventual
      // Subscription object. Set it explicitly via subscription_data so
      // customer.subscription.* events carry user_id for the webhook
      // dispatcher — no fragile customer_id lookup needed.
      subscription_data: {
        metadata: { user_id: user.id },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
