import { describe, expect, it } from "vitest";
import { buildMemoryEntriesBlock } from "@/lib/ai/memory-context";
import { MEMORY_PROMPT_MAX_CHARS } from "@/lib/services/memory-entries";
import type { UserMemoryEntry } from "@/types/database";

// Phase 2 — premium memory injection block. Pure function over typed
// entries; tests lock the format invariants the LLM relies on (one
// entry per line, kind tag in brackets, French label) and the hard
// char budget so the block never blows past the cached prefix size.

function makeEntry(
  partial: Partial<UserMemoryEntry> & {
    summary: string;
    kind: UserMemoryEntry["kind"];
  },
): UserMemoryEntry {
  return {
    id: partial.id ?? `e-${partial.summary.slice(0, 8)}`,
    user_id: "u-1",
    kind: partial.kind,
    key: partial.key ?? partial.summary.slice(0, 20),
    summary: partial.summary,
    detail: partial.detail ?? null,
    importance: partial.importance ?? 3,
    confidence: partial.confidence ?? 3,
    source: partial.source ?? "coach",
    conversation_id: partial.conversation_id ?? null,
    expires_at: partial.expires_at ?? null,
    last_referenced_at: partial.last_referenced_at ?? null,
    archived_at: partial.archived_at ?? null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

describe("buildMemoryEntriesBlock", () => {
  it("returns null when no entries — caller skips the block", () => {
    expect(buildMemoryEntriesBlock([])).toBeNull();
  });

  it("renders one line per entry with the kind tag", () => {
    const block = buildMemoryEntriesBlock([
      makeEntry({ kind: "goal", summary: "Acheter une maison" }),
      makeEntry({ kind: "preference", summary: "Préfère le ton calme" }),
      makeEntry({ kind: "event", summary: "Augmentation salariale en juin" }),
      makeEntry({ kind: "blocker", summary: "Dépenses impulsives en soirée" }),
    ]);
    expect(block).not.toBeNull();
    if (!block) throw new Error("unreachable");
    expect(block).toContain("[objectif] Acheter une maison");
    expect(block).toContain("[préférence] Préfère le ton calme");
    expect(block).toContain("[événement] Augmentation salariale en juin");
    expect(block).toContain("[blocage] Dépenses impulsives en soirée");
  });

  it("includes the non-mechanical-recall instruction so the coach uses memory naturally", () => {
    const block = buildMemoryEntriesBlock([
      makeEntry({ kind: "goal", summary: "x" }),
    ]);
    expect(block).toContain("Mémoire personnelle de l'utilisateur");
    expect(block?.toLowerCase()).toContain("naturellement");
  });

  it("stays under MEMORY_PROMPT_MAX_CHARS even with many long entries", () => {
    const big = Array.from({ length: 50 }, (_, i) =>
      makeEntry({
        kind: "goal",
        summary: `Objectif ${i} avec beaucoup de contexte pour gonfler la taille de la ligne`.repeat(
          3,
        ),
      }),
    );
    const block = buildMemoryEntriesBlock(big);
    expect(block).not.toBeNull();
    expect(block!.length).toBeLessThanOrEqual(MEMORY_PROMPT_MAX_CHARS);
  });

  it("preserves entry order (caller is responsible for ranking)", () => {
    const block = buildMemoryEntriesBlock([
      makeEntry({ kind: "goal", summary: "first" }),
      makeEntry({ kind: "goal", summary: "second" }),
      makeEntry({ kind: "goal", summary: "third" }),
    ]);
    const idxFirst = block!.indexOf("first");
    const idxSecond = block!.indexOf("second");
    const idxThird = block!.indexOf("third");
    expect(idxFirst).toBeLessThan(idxSecond);
    expect(idxSecond).toBeLessThan(idxThird);
  });
});
