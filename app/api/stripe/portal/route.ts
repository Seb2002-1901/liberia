import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Customer Portal — opens Stripe's hosted portal for the user's
 * subscription (cancel / update payment method / view invoices).
 *
 * Requires the user to already have a stripe_customer_id, which is set
 * by the webhook after their first Checkout completion. If they have
 * not paid yet, return 400 with a clear message — the UI should not
 * show the Portal button in that case anyway.
 */
export async function POST(_request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe non configuré." },
      { status: 501 },
    );
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Authentification requise." },
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

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          "Aucun abonnement actif à gérer. Souscris d'abord à Premium pour accéder au portail.",
      },
      { status: 400 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${baseUrl}/settings/subscription`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

