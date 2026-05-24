import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY manquante. Configure-la pour activer le coach IA.",
    );
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

/**
 * Default model for the LIBERIA coach.
 * Sonnet 4.6 — best speed/intelligence balance for conversational financial
 * coaching. Adaptive thinking enabled in chat route.
 */
export const COACH_MODEL = "claude-sonnet-4-6";

/** Generous output ceiling. Coach answers are usually 2–6 paragraphs. */
export const COACH_MAX_TOKENS = 2048;
