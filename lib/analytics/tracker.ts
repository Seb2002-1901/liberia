/**
 * Public analytics surface. Today it's a no-op: no provider package is
 * installed, no events leave the process. Tomorrow we can wire one in
 * (PostHog, Vercel Analytics, …) by replacing the sink — the call sites
 * stay identical.
 *
 * Why no-op-by-default:
 *   - launch-readiness work shouldn't bind us to a vendor before we
 *     pick one
 *   - test runs and dev sessions never hit a network
 *   - if a user opts out, `track()` short-circuits before reaching the
 *     sink so the opt-out is honored even if a sink is registered
 *
 * Privacy note: every call site MUST pass the typed event from
 * `events.ts`. Don't pass arbitrary objects — the type system enforces
 * which properties may travel. Never put PII (email, full name, raw
 * messages, amounts) in `properties`.
 */
import type { AnalyticsEvent } from "@/lib/analytics/events";

export type TrackerContext = {
  /** Optional Supabase user id. Stays out of `event.properties`. */
  userId?: string;
  /** When true, the call short-circuits to a no-op. */
  optedOut?: boolean;
};

type Sink = (event: AnalyticsEvent, ctx: TrackerContext) => void | Promise<void>;

let sink: Sink | null = null;

/**
 * Replace the default no-op sink. Used by tests to capture events and
 * by a future provider adapter to forward them. Returns a teardown
 * function so callers can restore the previous sink.
 */
export function _setTrackerSink(s: Sink | null): () => void {
  const previous = sink;
  sink = s;
  return () => {
    sink = previous;
  };
}

/**
 * Fire an event. Safe in any context — server actions, route handlers,
 * cron, client components. Never throws. Honors `optedOut` even when
 * a sink is registered.
 */
export async function track(
  event: AnalyticsEvent,
  ctx: TrackerContext = {},
): Promise<void> {
  if (ctx.optedOut) return;
  if (!sink) return; // no provider configured today
  try {
    await sink(event, ctx);
  } catch {
    // Analytics MUST never crash the request that triggered it.
    // Swallow silently; observability lives on the sink's own pipeline.
  }
}

/**
 * Bind the analytics user identity. No-op until a real sink is wired.
 * Caller passes only the Supabase user id — never email or other PII.
 */
export async function identify(userId: string): Promise<void> {
  if (!sink) return;
  try {
    // Identity is encoded as an event the sink can specialise on.
    // Today: pure passthrough via the optional userId in ctx.
    await sink(
      { name: "login", properties: {} },
      { userId },
    );
  } catch {
    /* swallow */
  }
}

/**
 * Forget the bound identity (used on signOut). No-op without sink.
 */
export function reset(): void {
  // Hook for future sinks; today nothing to clear.
}
