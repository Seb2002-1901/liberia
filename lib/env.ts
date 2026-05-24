/**
 * Boolean accessors for optional integrations.
 *
 * Phase 2 services (Stripe live, Anthropic, Upstash, Sentry) are wired
 * conditionally — the app must remain runnable without them. Each
 * `isXConfigured()` is the single source of truth used by callers to
 * decide whether to actually call the service or short-circuit.
 */

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function isSentryConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN);
}
