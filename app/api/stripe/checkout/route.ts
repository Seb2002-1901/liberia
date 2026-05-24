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

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings/subscription?status=success`,
      cancel_url: `${baseUrl}/settings/subscription?status=cancel`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: "premium" },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
