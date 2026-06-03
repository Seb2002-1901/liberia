import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAppBaseUrl } from "@/lib/url";
import { getActionErrors } from "@/lib/i18n/action-errors";

export async function POST(_request: Request) {
  const tErr = await getActionErrors();
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: tErr("subUnavailable") },
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

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: tErr("noActiveSubscription") },
      { status: 400 },
    );
  }

  // getAppBaseUrl() trims any trailing slash so return_url doesn't end up
  // as `https://app.com//settings/subscription` (Stripe rejects malformed URLs).
  const baseUrl = getAppBaseUrl();

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${baseUrl}/settings/subscription`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : tErr("stripeError");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
