/**
 * Pure (client-safe) helper that maps onboarding behavior traits to a
 * coaching tone when the user hasn't explicitly picked one. Kept in
 * /lib/coach so it can be unit-tested without pulling the server-only
 * memory service into the suite.
 */
import type { CoachingTone } from "@/types/database";

export function resolveCoachingTone(
  explicit: CoachingTone | null | undefined,
  behaviorTraits: readonly string[] = [],
): CoachingTone {
  if (explicit) return explicit;
  const traits = new Set(behaviorTraits);
  if (traits.has("anxious") || traits.has("avoidant")) return "calm";
  if (traits.has("motivated")) return "direct";
  if (traits.has("organized") || traits.has("disciplined")) return "structured";
  if (traits.has("lost") || traits.has("rebuilding")) return "gentle";
  return "calm";
}
