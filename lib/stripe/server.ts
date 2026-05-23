import "server-only";
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "STRIPE_SECRET_KEY manquante. Configure .env.local pour activer Stripe.",
    );
  }
  cached = new Stripe(secret, {
    apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    typescript: true,
    appInfo: {
      name: "LIBERIA",
      version: "0.1.0",
    },
  });
  return cached;
}
