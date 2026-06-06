import type { UserMemoryEntry } from "@/types/database";
import { MEMORY_PROMPT_MAX_CHARS } from "@/lib/services/memory-entries";

/**
 * Render the selected memory entries as a compact markdown block to
 * inject into the system prompt of the coach. Pure function — easy
 * to unit-test the format invariant without an Anthropic call.
 *
 * The block is intentionally terse: each entry takes one line, the
 * kind is shown as a single-word tag, importance and freshness are
 * implicit in the rank order. Anything over MEMORY_PROMPT_MAX_CHARS
 * is dropped at the tail so we never blow past the cache-line budget.
 *
 * Returns null when there's nothing to inject — caller skips adding
 * the block to system[] altogether (one fewer cached chunk, fewer
 * dead tokens).
 */
export function buildMemoryEntriesBlock(
  entries: readonly UserMemoryEntry[],
): string | null {
  if (entries.length === 0) return null;

  const lines: string[] = [
    "# Mémoire personnelle de l'utilisateur",
    "",
    "Faits durables collectés au fil des conversations. Utilise-les pour personnaliser ta réponse SANS jamais les répéter mot-à-mot ni y faire référence de façon mécanique (\"comme tu m'avais dit le 12 mars…\"). Rappelle-les naturellement quand c'est utile, jamais comme une obligation.",
    "",
  ];

  let charsBudget = MEMORY_PROMPT_MAX_CHARS - lines.join("\n").length;

  for (const e of entries) {
    const tag = KIND_TAG[e.kind] ?? e.kind;
    // Phase 3.1.12 — inject the rich detail field too. Truncate at
    // 200 chars to keep the prompt budget under control. Detail
    // captures the "why" / "context" the user mentioned; summary
    // alone often loses the story.
    const detail =
      e.detail && e.detail.trim().length > 0
        ? ` — ${e.detail.trim().slice(0, 200)}`
        : "";
    const line = `- [${tag}] ${e.summary}${detail}`;
    if (line.length + 1 > charsBudget) break;
    lines.push(line);
    charsBudget -= line.length + 1;
  }

  return lines.join("\n");
}

const KIND_TAG: Record<string, string> = {
  goal: "objectif",
  preference: "préférence",
  event: "événement",
  blocker: "blocage",
};
