import { isAnthropicConfigured } from "@/lib/env";
import { isAdminConfigured } from "@/lib/supabase/admin";

/**
 * The two engines that can answer a LIBERIA AI request. The local
 * fallback is always available and never leaves the server; the
 * Anthropic adapter is selected when both the API key AND the service-
 * role admin client are configured (assistant messages can only be
 * persisted via admin since the ai_messages RLS policy restricts
 * user-side inserts to role='user').
 */
export type AiProviderKind = "anthropic" | "local";

export type AiProviderSelection = {
  kind: AiProviderKind;
  /**
   * Human-readable reason for the choice. Surfaced in admin
   * dashboards or logs, never in user UI. Keeps debugging trivial
   * when the env config changes between deploys.
   */
  reason: string;
};

/**
 * Picks the engine to use for the current request. Pure function over
 * env — same inputs, same outputs. Today returns `local` in dev (no
 * keys), `anthropic` in prod the day the operator wires the key.
 *
 * Callers (chat route, plan generator, future weekly insight job)
 * should branch on `.kind` and pass the same context to either engine
 * — that's what the normalizer + context builder are for.
 */
export function selectAiProvider(): AiProviderSelection {
  if (!isAnthropicConfigured()) {
    return {
      kind: "local",
      reason: "ANTHROPIC_API_KEY absent — fallback déterministe local.",
    };
  }
  if (!isAdminConfigured()) {
    return {
      kind: "local",
      reason:
        "SUPABASE_SERVICE_ROLE_KEY absent — sans admin client, impossible de persister la réponse côté serveur.",
    };
  }
  return {
    kind: "anthropic",
    reason: "Clés configurées — provider Anthropic actif.",
  };
}

/**
 * Convenience predicate for call sites that don't need the reason
 * string. Equivalent to `selectAiProvider().kind === "anthropic"`.
 */
export function isAnthropicProviderActive(): boolean {
  return selectAiProvider().kind === "anthropic";
}
