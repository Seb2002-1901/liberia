import "server-only";
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buildFinanceContext } from "@/lib/ai/context";
import { buildUserMemoryContext } from "@/lib/services/memory";
import { estimateTokens, SOFT_INPUT_BUDGET_TOKENS } from "@/lib/ai/budget";
import type { DrawerData } from "@/lib/calculations/health/types";
import type { FinanceData } from "@/lib/services/finance";
import type { UserMemory } from "@/types/database";

/**
 * The three-layer system context fed to the coach.
 *
 *   1. `systemPrompt`   — invariant tone + guardrails (never user-specific).
 *   2. `memoryContext`  — user personality, behavior traits, coaching tone,
 *                         recurring challenges, etc. — markdown.
 *   3. `financeContext` — point-in-time financial snapshot — markdown.
 *
 * Returned as separate strings so the Anthropic adapter can place each
 * in its own `system` block (with `cache_control: ephemeral` on the
 * stable ones), while the local fallback can ignore them entirely
 * (the deterministic generator already derives everything from
 * structured inputs).
 *
 * `meta` reports the rough token cost — used by the AI route to
 * decide whether to enable prompt-caching (only worth it above
 * Sonnet's 2048-token minimum).
 */
export type CoachSystemContext = {
  systemPrompt: string;
  memoryContext: string;
  financeContext: string;
  meta: {
    estimatedTokens: number;
    cacheable: boolean;
  };
};

/**
 * Composes the three-layer system context for the coach. Pure over
 * already-loaded data (no DB hop here — caller fetches via
 * `getFinanceData()` + `getMyUserMemory()`).
 */
export function buildCoachSystemContext(input: {
  finance: FinanceData;
  memory: UserMemory | null;
  /** Phase 3.2 — health score snapshot. Forwarded to buildFinanceContext
   *  which renders the dedicated "Financial Health Score" section. */
  drawerData?: DrawerData | null;
}): CoachSystemContext {
  const systemPrompt = COACH_SYSTEM_PROMPT;
  const memoryContext = buildUserMemoryContext({
    fullName: input.finance.profile.full_name,
    financialProfile: input.finance.financialProfile,
    memory: input.memory,
  });
  const financeContext = buildFinanceContext(input.finance, {
    drawerData: input.drawerData ?? null,
  });

  const estimatedTokens =
    estimateTokens(systemPrompt) +
    estimateTokens(memoryContext) +
    estimateTokens(financeContext);

  return {
    systemPrompt,
    memoryContext,
    financeContext,
    meta: {
      estimatedTokens,
      // Sonnet 4.6 caches `system` blocks ≥ 2048 tokens. Below that,
      // the cache_control hint is a silent no-op — flag here so the
      // adapter can skip the `cache_control` attribute entirely.
      cacheable: estimatedTokens >= 2048,
    },
  };
}

/**
 * Sanity check: a context that would exceed the soft input budget on
 * its own (BEFORE the user message + history) is almost certainly a
 * bug. Returns true when the system context already eats more than
 * 80% of the soft budget — caller should log + truncate aggressively.
 */
export function isContextOversized(ctx: CoachSystemContext): boolean {
  return ctx.meta.estimatedTokens > SOFT_INPUT_BUDGET_TOKENS * 0.8;
}
