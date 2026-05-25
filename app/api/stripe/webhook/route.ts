import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

/**
 * Stripe webhook (Phase 2).
 *
 * - Verifies the signature with the bytes Stripe signed.
 * - Records the event ID in `stripe_events` for idempotence; duplicate
 *   deliveries return 200 without re-processing.
 * - Persists subscription state into `public.subscriptions` via the
 *   service-role client (RLS prohibits the user from writing this).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!secret || !signature) {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!isAdminConfigured()) {
    // Signature is valid but we can't persist — log only.
    return NextResponse.json({ received: true, persisted: false });
  }

  const admin = getAdminClient();

  // Idempotence: ignore replays of an event we've already processed.
  const insertEvent = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type })
    .select("id")
    .maybeSingle();
  if (insertEvent.error) {
    if ((insertEvent.error as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, deduped: true });
    }
    return NextResponse.json(
      { error: insertEvent.error.message },
      { status: 500 },
    );
  }

  try {
    await handleEvent(event, admin);
  } catch (err) {
    // If processing fails we DELETE the idempotence row so Stripe's
    // automatic retry can pick the event up again.
    await admin.from("stripe_events").delete().eq("id", event.id);
    const message = err instanceof Error ? err.message : "Webhook processing error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(
  event: Stripe.Event,
  admin: ReturnType<typeof getAdminClient>,
): Promise<void> {
  // event.created is in seconds; convert to ISO for monotonic comparison.
  const eventCreatedAt = new Date(event.created * 1000).toISOString();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId =
        (session.metadata?.user_id as string | undefined) ??
        (session.client_reference_id ?? undefined);
      if (!userId || !session.subscription) return;

      const stripe = getStripe();
      const subscription = (await stripe.subscriptions.retrieve(
        session.subscription as string,
      )) as Stripe.Subscription;

      await upsertSubscription(admin, userId, subscription, session.customer, eventCreatedAt);
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId =
        (subscription.metadata?.user_id as string | undefined) ??
        (await resolveUserIdFromCustomer(admin, subscription.customer));
      if (!userId) return;
      await upsertSubscription(admin, userId, subscription, subscription.customer, eventCreatedAt);
      return;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (invoice as unknown as { subscription?: string | null }).subscription;
      if (!subId) return;
      const stripe = getStripe();
      const subscription = (await stripe.subscriptions.retrieve(subId)) as Stripe.Subscription;
      const userId =
        (subscription.metadata?.user_id as string | undefined) ??
        (await resolveUserIdFromCustomer(admin, subscription.customer));
      if (!userId) return;
      await upsertSubscription(admin, userId, subscription, subscription.customer, eventCreatedAt);
      return;
    }

    default:
      return;
  }
}

async function resolveUserIdFromCustomer(
  admin: ReturnType<typeof getAdminClient>,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | undefined> {
  const id = typeof customer === "string" ? customer : customer?.id;
  if (!id) return undefined;
  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", id)
    .maybeSingle();
  return data?.user_id ?? undefined;
}

function planFromSubscription(sub: Stripe.Subscription): "free" | "premium" {
  // Active + trialing = premium; everything else falls back to free.
  if (sub.status === "active" || sub.status === "trialing") return "premium";
  return "free";
}

function periodEndFromSubscription(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as
    | { current_period_end?: number }
    | undefined;
  const ts =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    item?.current_period_end ??
    null;
  return typeof ts === "number" ? new Date(ts * 1000).toISOString() : null;
}

function tsToIso(ts: number | null | undefined): string | null {
  return typeof ts === "number" ? new Date(ts * 1000).toISOString() : null;
}

function priceIdFromSubscription(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  return item?.price?.id ?? null;
}

async function upsertSubscription(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  sub: Stripe.Subscription,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  eventCreatedAt: string,
): Promise<void> {
  const customerId = typeof customer === "string" ? customer : customer?.id ?? null;

  // Atomic conditional upsert via Postgres function. The function does
  // INSERT ... ON CONFLICT DO UPDATE WHERE last_event_at < new, so two
  // parallel webhooks for the same user can't race to overwrite each
  // other — Postgres serializes the comparison + write in a single
  // statement.
  //
  // We also pass:
  //  - the price_id (so the UI can tell monthly from yearly)
  //  - trial_start / trial_end (Stripe timestamps in seconds)
  // The RPC flips trial_used=true the moment the subscription lands in a
  // trialing/active/past_due state — anti-abuse, so cancellation + new
  // checkout can't ever grant a 2nd free trial.
  const { error } = await admin.rpc("apply_subscription_event", {
    p_user_id: userId,
    p_customer_id: customerId,
    p_subscription_id: sub.id,
    p_status: sub.status,
    p_plan: planFromSubscription(sub),
    p_current_period_end: periodEndFromSubscription(sub),
    p_cancel_at_period_end: sub.cancel_at_period_end ?? false,
    p_event_at: eventCreatedAt,
    p_price_id: priceIdFromSubscription(sub),
    p_trial_started_at: tsToIso(sub.trial_start),
    p_trial_ends_at: tsToIso(sub.trial_end),
  });
  if (error) throw error;
}
