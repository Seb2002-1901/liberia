/**
 * Cost-control primitives for the AI surface. Centralized so the
 * Anthropic adapter, the local fallback and any future provider use
 * the same caps — a single place to tighten if costs ever spike.
 *
 * Numbers in this module are budgets in TOKENS (estimated). For
 * Sonnet 4.6 at $3/Mtoken input + $15/Mtoken output:
 *   - SOFT_INPUT_BUDGET 30_000 → ≈ 0.10 CHF / call worst case input
 *   - HARD_INPUT_BUDGET 120_000 → ≈ 0.40 CHF / call (kill switch)
 *
 * The DB-level CHECK on ai_messages.content (16k chars ≈ 4k tokens)
 * and the per-message zod cap (4000 chars input from user) already
 * bound the upstream. These constants govern AGGREGATE context size
 * (system prompt + memory + finance + history).
 */

/**
 * Rough token estimate based on the empirical "1 token ≈ 4 chars"
 * rule for Latin scripts. Good enough to budget — never used for
 * billing. The real Anthropic SDK reports authoritative usage in the
 * stream's `finalMessage()`.
 */
export function estimateTokens(text: string): number {
  if (typeof text !== "string" || text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

/** Soft per-call input token target. Most requests should stay under it. */
export const SOFT_INPUT_BUDGET_TOKENS = 30_000;

/**
 * Hard per-call input token cap — kill switch. The truncator will
 * never let a single message array exceed this even after dropping
 * the oldest turns.
 */
export const HARD_INPUT_BUDGET_TOKENS = 120_000;

/**
 * Wall-clock budget for a single AI request, ms. Anthropic streams
 * usually finish well under this; the cap protects against runaway
 * latency from edge networking issues.
 */
export const REQUEST_TIMEOUT_MS = 45_000;

/** Per-attempt retry caps for transient errors (5xx / network). */
export const RETRY_MAX_ATTEMPTS = 2;
export const RETRY_BACKOFF_MS = [1000, 3000] as const;

export type Message = { role: "user" | "assistant"; content: string };

/**
 * Drop the oldest messages until the total estimated token count
 * fits inside `maxTokens`. Always keeps the latest message (the new
 * user turn) so we never short-circuit the actual request. Pure
 * function — caller passes the array, gets a new (possibly shorter)
 * array back.
 *
 * Returns the truncated messages plus a flag telling the caller
 * whether anything was dropped (useful for telemetry / debugging).
 */
export function truncateMessagesForBudget(
  messages: Message[],
  maxTokens: number = SOFT_INPUT_BUDGET_TOKENS,
): { messages: Message[]; dropped: number } {
  if (messages.length === 0) return { messages: [], dropped: 0 };

  let used = 0;
  const kept: Message[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const t = estimateTokens(m.content);
    if (kept.length > 0 && used + t > maxTokens) break;
    // Always include the most recent message even if it alone busts
    // the budget — otherwise we'd silently drop the user's request.
    kept.unshift(m);
    used += t;
  }
  return { messages: kept, dropped: messages.length - kept.length };
}

/**
 * Wrap an async fn with a hard timeout. Resolves with the fn's
 * result, or rejects with a stable Error message if the wall-clock
 * exceeds `ms`. The fn keeps running in the background (no
 * AbortController) — caller is responsible for upstream cancellation.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number = REQUEST_TIMEOUT_MS,
  label = "AI request",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Retry an async fn on transient errors (5xx / network). Stops on
 * 4xx / abort errors — those won't get better by retrying. Backoff
 * follows the RETRY_BACKOFF_MS table.
 *
 * `isTransient` lets the caller decide what counts as a retryable
 * error. Default: anything that's not an explicit "abort" or
 * "AbortError" name.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    maxAttempts?: number;
    isTransient?: (err: unknown) => boolean;
  } = {},
): Promise<T> {
  const max = opts.maxAttempts ?? RETRY_MAX_ATTEMPTS;
  const isTransient = opts.isTransient ?? defaultIsTransient;
  let lastErr: unknown;
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === max - 1) throw err;
      const wait = RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
      await new Promise<void>((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

function defaultIsTransient(err: unknown): boolean {
  if (err instanceof Error) {
    const name = err.name.toLowerCase();
    const msg = err.message.toLowerCase();
    if (name === "aborterror" || msg.includes("abort")) return false;
    if (msg.includes("timeout")) return true;
    if (msg.includes("network")) return true;
    if (/\b(5\d\d)\b/.test(msg)) return true;
    if (/\b(429|503)\b/.test(msg)) return true;
  }
  return false;
}
