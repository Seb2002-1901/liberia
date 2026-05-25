/**
 * Privacy gate around analytics.
 *
 * LIBERIA is privacy-friendly by design: no fingerprinting, no
 * cross-site tracking, no resale. The opt-out toggle in /settings
 * lets a user disable the (already minimal) product analytics entirely.
 *
 * This module exposes a single helper used by every call site that
 * fires an event from a user-tied context. The check defaults to
 * "opted in" (boolean is false by default at the DB level) — caller
 * still passes the value through `track(..., { optedOut })` so the
 * tracker itself stays a pure function over its arguments.
 */
import type { UserSettings } from "@/types/database";

/**
 * Returns true when the user has explicitly disabled product analytics.
 * Defaults to false (= opted in) when no settings row exists yet.
 */
export function isAnalyticsOptedOut(
  settings: Pick<UserSettings, "analytics_opt_out"> | null | undefined,
): boolean {
  return Boolean(settings?.analytics_opt_out);
}
