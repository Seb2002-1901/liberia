import { NextResponse } from "next/server";
import { z } from "zod";
import {
  STRIPE_PLANS,
  TRIAL_DAYS,
  isStripeConfigured,
  type StripePlanId,
} from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAppBaseUrl } from "@/lib/url";
import { getActionErrors } from "@/lib/i18n/action-errors";

const bodySchema = z.object({
  planId: z.enum([
    "standard_monthly",
    "standard_yearly",
    "premium_monthly",
    "premium_yearly",
  ]),
});

export async function POST(request: Request) {
  const tErr = await getActionErrors();
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: tErr("subscriptionsActivating") },
      { status: 501 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: tErr("invalidRequest") }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: tErr("planInvalid") }, { status: 400 });
  }

  const planId: StripePlanId = parsed.data.planId;
  const plan = STRIPE_PLANS[planId];
  if (!plan?.priceId) {
    return NextResponse.json(
      { error: tErr("planNotYet") },
      { status: 501 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: tErr("authRequired") },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: tErr("authRequired") }, { status: 401 });
  }

  const rate = await checkRateLimit("stripe", user.id);
  if (!rate.success) {
    return NextResponse.json(
      { error: tErr("tooManyAttempts") },
      { status: 429 },
    );
  }

  // NEXT_PUBLIC_APP_URL is the only trusted origin for Stripe redirects.
  // Never fall back to the Origin header — an attacker controls it and could
  // redirect the user back to a malicious domain after payment.
  // getAppBaseUrl() trims any trailing slash so success_url doesn't end up
  // as `https://app.com//settings/subscription` (Stripe rejects malformed URLs).
  const baseUrl = getAppBaseUrl();

  // Reuse the existing Stripe Customer if we've already provisioned one
  // for this user (previous checkout, even if since cancelled). Without
  // this, every new subscription creates a fresh Customer in Stripe and
  // the lookup-by-customer-id fallback in the webhook breaks across
  // resubscription cycles. Also pull `trial_used` so we can deny a 2nd
  // free trial — once consumed, the user pays immediately on resubscribe.
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, trial_used")
    .eq("user_id", user.id)
    .maybeSingle();

  const trialDays = existingSub?.trial_used ? 0 : TRIAL_DAYS;

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
      // Note on payment methods: Stripe's `automatic_payment_methods`
      // is NOT available in `mode: 'subscription'` (payment/setup
      // modes only, per Stripe API 2024-12-18). In subscription mode
      // the available methods come from the Stripe Dashboard
      // configuration of the account + the Price. Operator must
      // activate cards, Apple Pay, Google Pay and TWINT in
      // Dashboard → Settings → Payment methods — they then appear
      // automatically at checkout without code changes. See
      // STRIPE_SETUP.md §3.
      payment_method_collection: "always",
      automatic_tax: { enabled: false },
      subscription_data: {
        // CRITICAL: session metadata is NOT propagated to the eventual
        // Subscription object. Set it explicitly via subscription_data so
        // customer.subscription.* events carry user_id for the webhook
        // dispatcher — no fragile customer_id lookup needed.
        metadata: { user_id: user.id },
        // 14-day free trial — Stripe charges automatically when it
        // ends. trial_days = 0 when the user already consumed their
        // trial (anti-abuse, enforced server-side from `trial_used`).
        ...(trialDays > 0
          ? {
              trial_period_days: trialDays,
              trial_settings: {
                end_behavior: {
                  // If the user removes their card during the trial and we
                  // can't charge at the end, pause Stripe's billing —
                  // their access lapses cleanly until they fix it via the
                  // Customer Portal.
                  missing_payment_method: "pause",
                },
              },
            }
          : {}),
      },
      success_url: `${baseUrl}/settings/subscription?status=success`,
      cancel_url: `${baseUrl}/settings/subscription?status=cancel`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: "premium", price_id: plan.priceId },
      allow_promotion_codes: true,
      locale: "fr",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : tErr("stripeError");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
